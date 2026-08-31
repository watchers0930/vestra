/**
 * NextAuth v5 설정
 *
 * 소셜 로그인(Google/카카오/네이버) + JWT 세션 전략
 * Prisma 어댑터로 사용자/계정 DB 저장
 *
 * 동적 프로바이더: DB에 저장된 OAuth 키를 우선 사용하고,
 * 없으면 환경변수로 폴백. 관리자 대시보드에서 키 설정 가능.
 *
 * @module lib/auth
 */

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import Naver from "next-auth/providers/naver";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getOAuthSettings } from "./system-settings";
import { logAudit } from "./audit-log";
import { SIGNUP_INTENT_COOKIE } from "./signup-intent";

// AUTH_SECRET 필수 검증 (런타임 요청 시 fail-fast)
if (typeof window === "undefined" && !process.env.AUTH_SECRET && !process.env.NEXT_PHASE) {
  throw new Error(
    "AUTH_SECRET 환경변수가 설정되지 않았습니다. " +
    "`openssl rand -base64 32`로 생성 후 .env에 추가하세요."
  );
}

/** 역할별 기본 일일 제한 */
export const ROLE_LIMITS: Record<string, number> = {
  GUEST: 2,
  PERSONAL: 5,
  RENTAL_BIZ: 50,
  BUSINESS: 50,
  REALESTATE: 100,
  LAWYER: 100,
  ADMIN: 9999,
};

// ─── 공통 이벤트 (감사 로그) ───

const authEvents: NextAuthConfig["events"] = {
  async signIn({ user, account }) {
    logAudit({
      userId: user.id,
      action: "LOGIN",
      detail: { provider: account?.provider || "credentials", email: user.email },
    });
  },
  async signOut(message) {
    // NextAuth v5: signOut receives { session } or { token } depending on strategy
    const token = "token" in message ? message.token : null;
    logAudit({
      userId: (token as Record<string, unknown> | null)?.id as string | undefined,
      action: "LOGOUT",
    });
  },
  async createUser({ user }) {
    logAudit({
      userId: user.id,
      action: "SIGNUP",
      detail: { email: user.email },
    });
  },
};

// ─── 공통 콜백 + 페이지 설정 ───

/** 네이버 프로필에서 표시 이름 결정: 실명 > 별명 > 이메일 로컬파트 */
function resolveNaverName(
  r: { name?: string; nickname?: string },
  email?: string | null
): string | null {
  return r.name?.trim() || r.nickname?.trim() || (email ? email.split("@")[0] : null);
}

const authCallbacks: NextAuthConfig["callbacks"] = {
  // 재가입 차단: 탈퇴 후 30일 이내면 로그인/가입 거부
  async signIn({ user, account, profile }) {
    if (user.email) {
      const withdrawn = await prisma.withdrawnEmail.findUnique({ where: { email: user.email } });
      if (withdrawn) {
        const days = (Date.now() - withdrawn.withdrawnAt.getTime()) / 86_400_000;
        if (days < 30) return "/login?error=withdrawn";
        // 30일 경과 → 이력 제거 후 재가입 허용
        await prisma.withdrawnEmail.delete({ where: { email: user.email } }).catch(() => {});
      }
    }

    // 미가입 소셜 계정의 "로그인" 차단 → 회원가입 유도.
    // 회원가입 버튼만 signup_intent 쿠키를 심으므로, 신규 소셜 계정이 쿠키 없이
    // 들어오면(=로그인 시도) 계정 자동 생성을 막고 로그인 화면으로 돌려보낸다.
    if (account && account.provider !== "credentials") {
      const linked = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        select: { id: true, userId: true },
      });
      if (!linked) {
        let hasSignupIntent = false;
        try {
          const store = await cookies();
          hasSignupIntent = store.get(SIGNUP_INTENT_COOKIE)?.value === "1";
        } catch {
          // 쿠키 접근 불가 시 안전하게 차단(가입은 명시적 경로로만)
        }
        if (!hasSignupIntent) {
          return "/login?error=not_registered";
        }
      } else if (account.provider === "naver" && (!user.name || !user.name.trim())) {
        // 기존 네이버 유저인데 name이 비어있으면 프로필에서 소급 복원
        // (초기 기본 매핑 버그로 null 저장된 유저 대상 — 재로그인 시 자동 채움)
        const r = (profile as { response?: { name?: string; nickname?: string } } | null)?.response;
        const recovered = r ? resolveNaverName(r, user.email) : null;
        if (recovered) {
          await prisma.user
            .updateMany({
              where: { id: linked.userId, OR: [{ name: null }, { name: "" }] },
              data: { name: recovered },
            })
            .catch(() => {});
        }
      }
    }

    return true;
  },
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
    }

    // 매 요청마다 DB에서 최신 role/verifyStatus 동기화
    // (어드민 승인 즉시 반영을 위해 캐시 없음 — PK SELECT 3컬럼, ~1ms)
    if (token.id) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, dailyLimit: true, verifyStatus: true, userType: true },
        });
        token.role = dbUser?.role || "PERSONAL";
        token.dailyLimit = dbUser?.dailyLimit || ROLE_LIMITS.PERSONAL;
        token.verifyStatus = dbUser?.verifyStatus || "none";
        token.userType = dbUser?.userType ?? null;
      } catch {
        // DB 일시 장애 시 기존 토큰 값 유지 (OAuth 콜백 Configuration 에러 방지)
        token.role = token.role ?? "PERSONAL";
        token.dailyLimit = token.dailyLimit ?? ROLE_LIMITS.PERSONAL;
        token.verifyStatus = token.verifyStatus ?? "none";
        token.userType = token.userType ?? null;
      }
    }

    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.dailyLimit = token.dailyLimit as number;
      session.user.verifyStatus = token.verifyStatus as string;
      session.user.userType = (token.userType as string | null) ?? null;
    }
    return session;
  },
};

const credentialsProvider = Credentials({
  name: "관리자 로그인",
  credentials: {
    email: { label: "이메일", type: "email" },
    password: { label: "비밀번호", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) return null;

    const user = await prisma.user.findUnique({
      where: { email: credentials.email as string },
    });

    if (!user?.password || user.role !== "ADMIN") {
      logAudit({
        action: "LOGIN_FAILED",
        detail: { email: credentials.email, reason: "invalid_user_or_role" },
      });
      return null;
    }

    const isValid = await bcrypt.compare(
      credentials.password as string,
      user.password
    );
    if (!isValid) {
      logAudit({
        userId: user.id,
        action: "LOGIN_FAILED",
        detail: { email: credentials.email, reason: "invalid_password" },
      });
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      dailyLimit: user.dailyLimit,
      verifyStatus: user.verifyStatus,
    };
  },
});

// ─── 동적 프로바이더 빌드 (DB 우선, env 폴백) ───

function normalizeOAuthValue(value?: string) {
  return value?.replace(/\\n/g, "").trim();
}

function buildProviders(settings: Record<string, string>) {
  const providers: NextAuthConfig["providers"] = [];

  const googleId = normalizeOAuthValue(settings.AUTH_GOOGLE_ID || process.env.AUTH_GOOGLE_ID);
  const googleSecret = normalizeOAuthValue(settings.AUTH_GOOGLE_SECRET || process.env.AUTH_GOOGLE_SECRET);
  if (googleId && googleSecret) {
    providers.push(Google({ clientId: googleId, clientSecret: googleSecret }));
  }


  const naverId = normalizeOAuthValue(settings.NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID);
  const naverSecret = normalizeOAuthValue(settings.NAVER_CLIENT_SECRET || process.env.NAVER_CLIENT_SECRET);
  if (naverId && naverSecret) {
    // 기본 Naver provider는 name을 nickname만 매핑 → 별명 미동의 시 User.name이 null.
    // 실제 이름(response.name) 우선, 없으면 별명, 그것도 없으면 이메일 로컬파트로 폴백.
    providers.push(
      Naver({
        clientId: naverId,
        clientSecret: naverSecret,
        profile(profile) {
          const r = profile.response;
          return {
            id: r.id,
            name: resolveNaverName(r, r.email),
            email: r.email,
            image: r.profile_image,
          };
        },
      })
    );
  }

  providers.push(credentialsProvider);

  return providers;
}

// ─── 브라우저 닫힘 = 로그아웃: maxAge 없는 세션 쿠키로 설정 ───

const isSecure = process.env.NODE_ENV === "production";
const SESSION_COOKIE_CONFIG: NextAuthConfig["cookies"] = {
  sessionToken: {
    // 미들웨어(proxy.ts)와 동일한 이름 — Auth.js v5 기본값
    name: isSecure ? "__Secure-authjs.session-token" : "authjs.session-token",
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isSecure,
      // maxAge 없음 → 브라우저 세션 쿠키 → 닫히면 삭제
    },
  },
};

// ─── 동적 Auth (소셜 로그인 라우트용 — DB에서 키 로드) ───

export async function createDynamicAuth() {
  const settings = await getOAuthSettings();
  return NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    secret: normalizeOAuthValue(process.env.AUTH_SECRET),
    trustHost: true,
    providers: buildProviders(settings),
    pages: { signIn: "/login" },
    callbacks: authCallbacks,
    events: authEvents,
    cookies: SESSION_COOKIE_CONFIG,
  });
}

// ─── 정적 Auth (미들웨어, 서버 컴포넌트용 — env 기반) ───

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: normalizeOAuthValue(process.env.AUTH_SECRET),
  trustHost: true,
  providers: buildProviders({}),
  pages: { signIn: "/login" },
  callbacks: authCallbacks,
  events: authEvents,
  cookies: SESSION_COOKIE_CONFIG,
});

// ---------------------------------------------------------------------------
// NextAuth 타입 확장
// ---------------------------------------------------------------------------

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      dailyLimit: number;
      verifyStatus: string;
      userType: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role?: string;
    dailyLimit?: number;
    verifyStatus?: string;
    userType?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    dailyLimit?: number;
    verifyStatus?: string;
    userType?: string | null;
  }
}
