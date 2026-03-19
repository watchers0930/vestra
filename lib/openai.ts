/**
 * OpenAI 클라이언트 + DB 기반 비용 가드
 *
 * Neon Postgres를 사용하여 서버리스 인스턴스 간에도
 * 사용자별 일일 호출 횟수를 정확하게 제한합니다.
 *
 * @module lib/openai
 */

import OpenAI from "openai";
import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// OpenAI Client
// ---------------------------------------------------------------------------

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  return new OpenAI({ apiKey });
}

// ---------------------------------------------------------------------------
// Cost Guard: DB 기반 사용자별 일일 호출 제한
// ---------------------------------------------------------------------------

/** 기본 일일 호출 한도 */
const DEFAULT_DAILY_LIMIT = 50;

/** DB 장애 시 메모리 기반 폴백 카운터 (인스턴스 단위) */
const fallbackCounter = new Map<string, { date: string; count: number }>();
const FALLBACK_LIMIT = 20; // DB 장애 시 보수적 한도

export async function checkOpenAICostGuard(
  userId: string,
  dailyLimit: number = DEFAULT_DAILY_LIMIT
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const id = `usage:${userId}`;

  try {
    const entry = await prisma.dailyUsage.findUnique({ where: { id } });

    // 새 날짜 또는 새 사용자
    if (!entry || entry.date !== today) {
      await prisma.dailyUsage.upsert({
        where: { id },
        update: { date: today, count: 1 },
        create: { id, date: today, count: 1 },
      });
      return { allowed: true, remaining: dailyLimit - 1, limit: dailyLimit };
    }

    // 한도 초과 확인
    if (entry.count >= dailyLimit) {
      return { allowed: false, remaining: 0, limit: dailyLimit };
    }

    // 카운트 증가
    await prisma.dailyUsage.update({
      where: { id },
      data: { count: entry.count + 1 },
    });

    return {
      allowed: true,
      remaining: dailyLimit - (entry.count + 1),
      limit: dailyLimit,
    };
  } catch {
    // DB 장애 시 메모리 기반 폴백 (보수적 한도 적용)
    const key = `${userId}:${today}`;
    const fb = fallbackCounter.get(key) || { date: today, count: 0 };
    if (fb.date !== today) {
      fb.date = today;
      fb.count = 0;
    }
    fb.count++;
    fallbackCounter.set(key, fb);

    if (fb.count > FALLBACK_LIMIT) {
      return { allowed: false, remaining: 0, limit: FALLBACK_LIMIT };
    }
    return { allowed: true, remaining: FALLBACK_LIMIT - fb.count, limit: FALLBACK_LIMIT };
  }
}
