/**
 * API 응답 캐시 (인메모리 LRU)
 *
 * OpenAI / MOLIT / Court API 중복 호출 방지.
 * 동일 요청 키에 대해 TTL 내 캐시된 결과 반환.
 *
 * Vercel Serverless 환경에서는 함수 인스턴스 수명 동안 유지.
 * (cold start 시 리셋되므로 별도 외부 캐시 불필요)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL = 10 * 60 * 1000; // 10분
const MAX_ENTRIES = 200;

export class APICache {
  private cache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // LRU: 접근한 항목을 끝으로 이동
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    // LRU: 최대 크기 초과 시 가장 오래된 항목 제거
    if (this.cache.size >= MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, expiresAt: Date.now() + ttl });
  }

  /** 캐시 키 생성 (prefix + 입력값 해시) */
  static makeKey(prefix: string, ...args: unknown[]): string {
    const str = JSON.stringify(args);
    // 간단한 해시 (djb2)
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return `${prefix}:${hash.toString(36)}`;
  }
}

export const apiCache = new APICache();
