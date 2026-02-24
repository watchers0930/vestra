/**
 * OpenAI 클라이언트 + 비용 가드
 *
 * 사용자별 일일 호출 횟수를 제한하여 OpenAI API 비용을 통제합니다.
 *
 * @module lib/openai
 */

import OpenAI from "openai";

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
// Cost Guard: 사용자별 일일 호출 제한
// ---------------------------------------------------------------------------

interface UsageEntry {
  count: number;
  date: string; // YYYY-MM-DD
}

const usageStore = new Map<string, UsageEntry>();

/** 기본 일일 호출 한도 */
const DEFAULT_DAILY_LIMIT = 50;

/**
 * OpenAI API 호출 비용 가드
 *
 * @param userId - 사용자 ID (미인증 시 IP 등)
 * @param dailyLimit - 일일 최대 호출 횟수 (기본 50)
 * @returns { allowed: boolean, remaining: number, limit: number }
 */
export function checkOpenAICostGuard(
  userId: string,
  dailyLimit: number = DEFAULT_DAILY_LIMIT
): { allowed: boolean; remaining: number; limit: number } {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const entry = usageStore.get(userId);

  // 새 날짜 또는 새 사용자
  if (!entry || entry.date !== today) {
    usageStore.set(userId, { count: 1, date: today });
    return { allowed: true, remaining: dailyLimit - 1, limit: dailyLimit };
  }

  // 한도 초과 확인
  entry.count++;

  if (entry.count > dailyLimit) {
    return { allowed: false, remaining: 0, limit: dailyLimit };
  }

  return {
    allowed: true,
    remaining: dailyLimit - entry.count,
    limit: dailyLimit,
  };
}
