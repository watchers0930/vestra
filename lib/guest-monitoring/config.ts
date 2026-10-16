import { GuestError } from "./errors";
export function guestMonitoringEnabled() {
  return process.env.GUEST_MONITORING_ENABLED === "true";
}
export function requireEnabled() {
  if (!guestMonitoringEnabled()) throw new GuestError("not_found", 404);
}
export function requireCrypto() {
  if (!process.env.PII_ENCRYPTION_KEY || !process.env.PII_SALT ||
      !(process.env.SEARCH_INDEX_KEY || process.env.AUTH_SECRET)) {
    throw new GuestError("provider_unavailable", 503);
  }
}
export function assertDecrypted(...values: (string | null)[]) {
  requireCrypto();
  if (values.some(v => !v || /^v\d+:/.test(v))) throw new GuestError("provider_unavailable", 503);
}
export const DRAFT_TTL = 30 * 60_000;
// 본인인증 전(OTP 대기·다날 인증창) 창의 수명. 인증 완료 후에는 유휴/절대 정책으로 전환된다.
export const SESSION_TTL = 15 * 60_000;
export const ORDER_TTL = 20 * 60_000;
// 비회원 로그아웃 정책(본인인증 완료 세션): 유휴 10분(슬라이딩) + 절대 상한 60분(verifiedAt 기준).
// 민감정보(타인 주소·감시기록) 노출 최소화. 매 인증요청마다 expiresAt=min(now+IDLE, verifiedAt+ABSOLUTE).
export const GUEST_IDLE_TTL = 10 * 60_000;
export const GUEST_ABSOLUTE_TTL = 60 * 60_000;
