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

/**
 * 상단 스텝 인디케이터에 노출되는 6단계.
 * 설계서 §8.3 선결제 흐름: 작성 → 결제 → 변호사 검증·직인 → 발송.
 */
export const JOURNEY_STEPS: StepMeta[] = [
  { step: 1, label: "정보입력", view: "compose" },
  { step: 2, label: "AI 초안", view: "compose" },
  { step: 3, label: "결제", view: "review" },
  { step: 4, label: "변호사 검증", view: "review" },
  { step: 5, label: "발송·추적", view: "track" },
  { step: 6, label: "사후관리", view: "track" },
];
