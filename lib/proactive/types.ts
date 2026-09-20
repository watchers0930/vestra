/**
 * 능동 인사이트 브리핑 — 공용 타입
 * ───────────────────────────────
 * 사용자의 자산·계약·등기감시·구독 상태에서 추출한 "신경 써야 할 신호(Signal)"와
 * AI가 이를 종합한 브리핑 결과의 타입을 정의한다.
 *
 * @module lib/proactive/types
 */

/** 신호 심각도 — 정렬·표시 우선순위 결정 */
export type SignalSeverity = "critical" | "high" | "medium" | "info";

/** 신호 종류 */
export type SignalKind =
  | "registry_alert" // 미확인 등기 변동 알림
  | "contract_expiry" // 임대차 계약 만료 임박
  | "subscription_expiry" // 구독 만료 임박
  | "high_risk_asset" // 안전도 낮은 보유 자산
  | "unanalyzed_asset"; // 아직 분석되지 않은 자산

/** 사용자가 챙겨야 할 단일 신호(규칙 기반으로 추출, AI 아님) */
export interface Signal {
  kind: SignalKind;
  severity: SignalSeverity;
  /** 카드 제목 (사용자 표시) */
  title: string;
  /** 근거 상세 (사용자 표시 + AI 입력) */
  detail: string;
  /** 클릭 시 이동할 앱 내 경로 */
  actionUrl: string;
  /** 액션 버튼 라벨 */
  actionLabel: string;
}

/** AI(또는 폴백)가 신호를 종합한 브리핑 */
export interface Briefing {
  /** 종합 요약/조언 (AI 생성 또는 규칙 기반 폴백) */
  headline: string;
  /** AI를 실제 사용했는지 (폴백이면 false) */
  aiUsed: boolean;
}

/** GET /api/proactive-briefing 응답 */
export interface ProactiveBriefingResponse {
  generatedAt: string;
  signalCount: number;
  signals: Signal[];
  headline: string;
  aiUsed: boolean;
}

/** 심각도 정렬용 랭크 (낮을수록 우선) */
export const SEVERITY_RANK: Record<SignalSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  info: 3,
};
