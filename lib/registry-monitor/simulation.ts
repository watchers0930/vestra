/**
 * 등기변동 모니터링 — 시뮬레이션/확정조회 헬퍼
 * ─────────────────────────────────────────────
 * 테스트/데모용 가짜 등기부 생성과 Tilko 등기부등본 발급 조회를 담당한다.
 * registry-monitor cron에서 추출(동작 변경 없음).
 */

import {
  fetchRegistryDocumentByAddress,
  isTilkoRegistryDocAvailable,
} from "@/lib/tilko-api";

// ── 시뮬레이션용 등기부 생성 ──
const SIMULATED_CHANGE_TEXT: Record<string, string> = {
  mortgage_added: "을구 제3호 근저당권설정 채권최고액 금4억8,000만원 (시뮬레이션)",
  seizure_added: "을구 제4호 가압류 서울중앙지방법원 (시뮬레이션)",
  ownership_changed: "갑구 제5호 소유권이전 (시뮬레이션)",
  auction_started: "갑구 제6호 경매개시결정 (시뮬레이션)",
};

export function generateSimulatedRegistry(
  baselineData: string | null,
  changeType: string
): string {
  const injectedText = SIMULATED_CHANGE_TEXT[changeType] || SIMULATED_CHANGE_TEXT.mortgage_added;

  if (baselineData) {
    return `${baselineData}\n${injectedText}`;
  }

  // 최소 더미 등기부
  return [
    "[표제부] 서울특별시 강남구 테헤란로 123 아파트 101동 1001호",
    "[갑구] 제1호 소유권보존 홍길동",
    "[을구] 제1호 근저당권설정 채권최고액 금2억원",
    injectedText,
  ].join("\n");
}

// ── Tilko 등기부등본 발급 조회 (확정 조회) ──
// 틸코/인터넷등기소 상류 장애로 보이는 오류인지 판별 (일시적 장애 vs 코드/권한 오류 구분)
export function isUpstreamError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /\((5\d\d)\)|An error has occurred|timeout|ETIMEDOUT|ECONNRESET|fetch failed|network/i.test(msg);
}

export async function fetchRegistryContent(
  address: string,
  options?: { simulate?: boolean; changeType?: string; baselineData?: string | null }
): Promise<{ text: string; raw?: Record<string, unknown> } | null> {
  // 시뮬레이션 모드: 외부 호출 없이 가짜 등기부 반환
  if (options?.simulate) {
    const text = generateSimulatedRegistry(
      options.baselineData ?? null,
      options.changeType || "mortgage_added"
    );
    return { text };
  }

  // Tilko 등기부등본 발급 (주소 기반)
  if (isTilkoRegistryDocAvailable()) {
    try {
      const result = await fetchRegistryDocumentByAddress({ address });
      return { text: result.text, raw: result.rawData };
    } catch (e) {
      console.error(`[CRON:MONITOR] Tilko 등기부 발급 실패: ${address}`, e instanceof Error ? e.message : e);
    }
  }

  // 폴백: 발급 불가 시 null 반환 → 변동 감지 skip
  return null;
}
