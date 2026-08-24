/**
 * 집키퍼 단일 여정(임차인) — 스텝 정의·상태 매핑 (클라이언트 안전, 순수)
 * HTML 프로토타입의 6스텝을 화면 3뷰(작성/검토·결제/진행현황)로 묶어 표시한다.
 */

/** 사용자에게 보여지는 6단계(HTML 프로토타입 기준) */
export type JourneyStep = 1 | 2 | 3 | 4 | 5 | 6;

/** 실제 렌더 뷰 — 2패널 작성 UX를 보존하기 위해 스텝을 3뷰로 묶는다 */
export type JourneyView = "compose" | "review" | "track";

export interface StepMeta {
  step: JourneyStep;
  label: string;
  view: JourneyView;
}

/** 상단 스텝 인디케이터에 노출되는 6단계 */
export const JOURNEY_STEPS: StepMeta[] = [
  { step: 1, label: "정보입력", view: "compose" },
  { step: 2, label: "AI 초안", view: "compose" },
  { step: 3, label: "변호사 검토", view: "review" },
  { step: 4, label: "결제", view: "review" },
  { step: 5, label: "발송·추적", view: "track" },
  { step: 6, label: "사후관리", view: "track" },
];

/** 뷰 → 그 뷰가 포함하는 스텝 번호들 */
export const VIEW_STEPS: Record<JourneyView, JourneyStep[]> = {
  compose: [1, 2],
  review: [3, 4],
  track: [5, 6],
};

/**
 * KeepzipCase.status(서버) → 현재 여정 스텝.
 * 서버 상태값과 1:1 매핑. 없는 값은 작성(1)으로 폴백.
 */
export function stepFromCaseStatus(status?: string | null): JourneyStep {
  switch (status) {
    case "lawyer_pending": return 3; // 변호사 검토 대기
    case "approved": return 4;       // 검토 완료 → 결제 대기
    case "paid": return 5;           // 결제 완료 → 발송/추적
    case "postal_sent":
    case "delivered":
    case "returned": return 5;       // 발송 이후 추적
    case "closed":
    case "unresponded": return 6;    // 종결/미대응 → 사후관리
    default: return 1;
  }
}

/** 스텝 번호 → 소속 뷰 */
export function viewOfStep(step: JourneyStep): JourneyView {
  return JOURNEY_STEPS.find((s) => s.step === step)?.view ?? "compose";
}
