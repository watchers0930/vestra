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
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getOAuthSettings } from "./system-settings";
import { logAudit } from "./audit-log";

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
  BUSINESS: 50,
  REALESTATE: 100,
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

const authCallbacks: NextAuthConfig["callbacks"] = {
  async jwt({ token, user, trigger, session }) {
    if (user) {
      token.id = user.id;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id as string },
        select: { role: true, dailyLimit: true, verifyStatus: true },
      });
      token.role = dbUser?.role || "PERSONAL";
      token.dailyLimit = dbUser?.dailyLimit || ROLE_LIMITS.PERSONAL;
      token.verifyStatus = dbUser?.verifyStatus || "none";
    }
    if (trigger === "update" && session) {
      if (session.role) token.role = session.role;
      if (session.dailyLimit) token.dailyLimit = session.dailyLimit;
      if (session.verifyStatus) token.verifyStatus = session.verifyStatus;
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.dailyLimit = token.dailyLimit as number;
      session.user.verifyStatus = token.verifyStatus as string;
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

function buildProviders(settings: Record<string, string>) {
  const providers: NextAuthConfig["providers"] = [];

  const googleId = settings.AUTH_GOOGLE_ID || process.env.AUTH_GOOGLE_ID;
  const googleSecret = settings.AUTH_GOOGLE_SECRET || process.env.AUTH_GOOGLE_SECRET;
  if (googleId && googleSecret) {
    providers.push(Google({ clientId: googleId, clientSecret: googleSecret }));
  }

  const kakaoId = settings.KAKAO_CLIENT_ID || process.env.KAKAO_CLIENT_ID;
  const kakaoSecret = settings.KAKAO_CLIENT_SECRET || process.env.KAKAO_CLIENT_SECRET;
  if (kakaoId && kakaoSecret) {
    providers.push(Kakao({ clientId: kakaoId, clientSecret: kakaoSecret }));
  }

  const naverId = settings.NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID;
  const naverSecret = settings.NAVER_CLIENT_SECRET || process.env.NAVER_CLIENT_SECRET;
  if (naverId && naverSecret) {
    providers.push(Naver({ clientId: naverId, clientSecret: naverSecret }));
  }

  providers.push(credentialsProvider);

  return providers;
}

// ─── 동적 Auth (소셜 로그인 라우트용 — DB에서 키 로드) ───

export async function createDynamicAuth() {
  const settings = await getOAuthSettings();
  return NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    providers: buildProviders(settings),
    pages: { signIn: "/login" },
    callbacks: authCallbacks,
    events: authEvents,
  });
}

// ─── 정적 Auth (미들웨어, 서버 컴포넌트용 — env 기반) ───

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: buildProviders({}),
  pages: { signIn: "/login" },
  callbacks: authCallbacks,
  events: authEvents,
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
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role?: string;
    dailyLimit?: number;
    verifyStatus?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    dailyLimit?: number;
    verifyStatus?: string;
  }
}
