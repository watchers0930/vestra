/**
 * NextAuth v5 설정
 *
 * 소셜 로그인(Google/카카오/네이버) + JWT 세션 전략
 * Prisma 어댑터로 사용자/계정 DB 저장
 *
 * @module lib/auth
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

/** 역할별 기본 일일 제한 */
export const ROLE_LIMITS: Record<string, number> = {
  GUEST: 2,
  PERSONAL: 5,
  BUSINESS: 50,
  REALESTATE: 100,
  ADMIN: 9999,
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    }),
    Naver({
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 첫 로그인 시 DB 사용자 정보를 토큰에 포함
      if (user) {
        token.id = user.id;
        // DB에서 role/dailyLimit 조회
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { role: true, dailyLimit: true, verifyStatus: true },
        });
        token.role = dbUser?.role || "PERSONAL";
        token.dailyLimit = dbUser?.dailyLimit || ROLE_LIMITS.PERSONAL;
        token.verifyStatus = dbUser?.verifyStatus || "none";
      }

      // 세션 업데이트 트리거 (역할 변경 시)
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
  },
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
