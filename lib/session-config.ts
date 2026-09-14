// 세션 자동 로그아웃 정책 — 단일 소스.
// SessionTimer(표시)와 SessionGuard(실제 로그아웃)가 반드시 같은 값을 써야
// 화면 카운트다운과 실제 로그아웃 시점이 일치한다.

/** 무활동 자동 로그아웃까지의 시간 (10분) */
export const INACTIVITY_MS = 10 * 60 * 1000;
