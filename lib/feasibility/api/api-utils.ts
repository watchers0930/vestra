/**
 * VESTRA API 공통 fetch 유틸리티
 * ────────────────────────────────
 * 여러 API 클라이언트(KOSIS, REPS, MOIS 등)에서 반복되는
 * fetch + 타임아웃 + 에러 핸들링 로직을 통합한 공통 함수.
 */

// ─── 기본 설정 ───

const DEFAULT_TIMEOUT_MS = 10_000;

// ─── 공통 fetch 함수 ───

/**
 * 타임아웃이 적용된 JSON fetch 함수.
 * AbortController로 타임아웃 처리, Response.ok 체크,
 * JSON 파싱 후 반환. 실패 시 console.warn + null 반환.
 *
 * @param url - 요청할 전체 URL
 * @param options - 타임아웃(ms), 추가 헤더 설정
 * @returns 파싱된 JSON 또는 실패 시 null
 */
export async function fetchWithTimeout<T>(
  url: string,
  options?: { timeout?: number; headers?: Record<string, string> }
): Promise<T | null> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "VESTRA/1.0",
        ...options?.headers,
      },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.warn("API 호출 실패:", error);
    return null;
  }
}
