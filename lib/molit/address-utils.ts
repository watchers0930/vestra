/**
 * 국토교통부 실거래가 API — 주소 유틸 + 배치 병렬 처리 (공용)
 */
import { LAWD_CODE_MAP } from "./molit-data";

/**
 * 주소에서 법정동 코드 추출
 *
 * 매칭 전략:
 * 1. 주소에서 "특별시", "광역시" 등 행정 접미사와 공백을 제거하여 정규화
 * 2. 키를 길이 내림차순 정렬하여 가장 구체적인 매칭을 우선 적용
 */
export function extractLawdCode(address: string): string | null {
  const normalized = address
    .replace(/특별자치시|특별자치도|특별시|광역시/g, "")
    .replace(/\s+/g, "");

  const entries = Object.entries(LAWD_CODE_MAP)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [key, code] of entries) {
    if (normalized.includes(key)) return code;
  }

  return null;
}

/**
 * 주소에서 법정동(읍/면/리) 및 아파트명 힌트를 추출
 */
export function extractAddressFilters(address: string): {
  dong: string | null;
  aptHint: string | null;
} {
  const tokens = address.trim().split(/\s+/);

  let dong: string | null = null;
  let aptHintTokens: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^.{1,10}[동읍면리가]$/.test(t) && !/[시도구군]$/.test(t.slice(0, -1))) {
      if (!/구$|시$|군$|도$/.test(t)) {
        dong = t;
        aptHintTokens = tokens.slice(i + 1).filter(
          (s) => !/^\d+[-\d]*$/.test(s) && s.length >= 2
        );
      }
    }
  }

  if (!dong) {
    const dongToken = tokens.find(
      (t) => /동$/.test(t) && t.length >= 2 && t.length <= 10 && !/구$|시$/.test(t.slice(0, -1))
    );
    if (dongToken) {
      dong = dongToken;
      const idx = tokens.indexOf(dongToken);
      aptHintTokens = tokens.slice(idx + 1).filter(
        (s) => !/^\d+[-\d]*$/.test(s) && s.length >= 2
      );
    }
  }

  const aptHint = aptHintTokens.length > 0 ? aptHintTokens.join(" ") : null;

  return { dong, aptHint };
}

/** 배치 병렬 처리 — API 과부하 방지 (6개월씩 배치) */
export async function batchFetch<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number = 6
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}
