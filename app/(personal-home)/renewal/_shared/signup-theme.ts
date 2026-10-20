/**
 * renewal 가입 공통 디자인 토큰(설계 renewal.design §1.2 TR-01).
 *
 * 색·테두리·radius 상수만 보유한다(로직·JSX 없음, lib성 상수). 모달(`RenewalSignupModal`)의
 * 인라인 style 기준값을 단일 소스로 승격해, 모달과 전체 페이지(`/signup/complete`, 사업자 위저드)가
 * 동일한 표현을 쓰도록 한다. 교체 대상 구 톤(text-muted/bg-card/VestraLogoMark)은 이 토큰으로 대체한다.
 */

export const SIGNUP_THEME = {
  /** 주요 글자 */
  text: "#1d1d1f",
  /** 보조 글자 */
  muted: "#6e6e73",
  /** 흐린 글자(캡션) */
  faint: "#8e8e93",
  /** 본문 보조 글자 */
  body: "#48484a",
  /** 카드/입력 테두리 */
  border: "#e5e5e7",
  /** 강조(브랜드 블루) */
  accent: "#0071e3",
  /** 카드 배경 */
  card: "#fff",
  /** 카드 radius */
  radius: 20,

  /** 상태 색 — 승인/완료(green) */
  successText: "#1d8a44",
  successIcon: "#30d158",
  successBg: "#e8f8ee",
  /** 상태 색 — 대기/심사(amber) */
  warningText: "#b26a00",
  warningBg: "#fff8e8",
  /** 상태 색 — 반려/오류(red) */
  dangerText: "#c0392b",
  dangerBg: "#fff4f3",
} as const;

export type SignupTheme = typeof SIGNUP_THEME;
