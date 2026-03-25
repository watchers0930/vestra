/**
 * Vercel KV 캐시 래퍼
 *
 * KV_REST_API_URL 환경변수가 설정된 경우 Vercel KV를 사용하고,
 * 미설정 시 인메모리 apiCache로 자동 폴백.
 * KV 오류 발생 시에도 인메모리로 폴백하여 서비스 중단 방지.
 */

import { kv } from "@vercel/kv";
import { apiCache } from "./api-cache";

function isKVConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export const kvCache = {
  /**
   * 캐시에서 값 조회.
   * KV 우선 → 인메모리 폴백.
   */
  async get<T>(key: string): Promise<T | null> {
    // 인메모리 먼저 확인 (빠름)
    const memCached = apiCache.get<T>(key);
    if (memCached !== null) return memCached;

    // KV 미설정이면 인메모리 결과 그대로 반환
    if (!isKVConfigured()) return null;

    try {
      const value = await kv.get<T>(key);
      if (value !== null && value !== undefined) {
        // KV에서 가져온 값을 인메모리에도 저장 (로컬 캐시 워밍)
        apiCache.set(key, value);
        return value;
      }
    } catch (err) {
      console.warn("[kv-cache] KV get 실패, 인메모리 폴백:", (err as Error).message);
    }

    return null;
  },

  /**
   * 캐시에 값 저장.
   * KV + 인메모리 양쪽에 저장.
   * @param ttlMs TTL (밀리초)
   */
  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    // 인메모리에는 항상 저장
    apiCache.set(key, value, ttlMs);

    if (!isKVConfigured()) return;

    try {
      const ttlSeconds = Math.max(1, Math.round(ttlMs / 1000));
      await kv.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      console.warn("[kv-cache] KV set 실패, 인메모리만 사용:", (err as Error).message);
    }
  },

  /**
   * 캐시에서 값 삭제.
   * KV + 인메모리 양쪽에서 삭제.
   */
  async del(key: string): Promise<void> {
    // 인메모리에서는 get으로 만료 처리 대신 set with 0 TTL
    apiCache.set(key, null, 0);

    if (!isKVConfigured()) return;

    try {
      await kv.del(key);
    } catch (err) {
      console.warn("[kv-cache] KV del 실패:", (err as Error).message);
    }
  },
};
