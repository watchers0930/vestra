import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "lib/prisma.ts",              // DB 싱글턴
        "lib/auth.ts",                // NextAuth 설정 (런타임 설정 객체)
        "lib/openai.ts",              // OpenAI 클라이언트 싱글턴
        "lib/store.ts",               // localStorage 기반 클라이언트 스토어
        "lib/use-hydrated.ts",        // React 클라이언트 훅
        "lib/event-bus.ts",           // 클라이언트 이벤트 버스
        "lib/patent-types.ts",        // 순수 타입 정의 (interface only)
        "lib/env.ts",                 // 환경변수 검증 (import 시점 실행)
        "lib/cron-auth.ts",           // Vercel Cron 인증 헬퍼
        "lib/kv-cache.ts",            // Vercel KV 캐시 래퍼
        "lib/live-weights.ts",        // DB 가중치 로더 (Prisma 의존)
        "lib/feasibility/feasibility-prompts.ts", // GPT 프롬프트 문자열
        "lib/feasibility/**/index.ts", // 배럴 re-export
        "**/*.d.ts",
      ],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
