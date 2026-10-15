export type GuestMonitoringStatus = "pending_payment" | "active" | "expired" | "abandoned";
export type GuestOrderStatus = "pending" | "paid" | "failed" | "canceled" | "refunded" | "needs_review";
export type GuestOrderPurpose = "initial" | "renewal";
export type VerificationPurpose = "apply" | "status" | "renewal";
export interface CheckLogItem {
  id: string;
  checkedAt: string;
  method: string;
  result: string;
  riskLevel: string | null;
  summary: string | null;
}
export interface GuestApiError { error: string; code: string }
export interface GuestDraftResponse {
  draftId: string;
  address: string;
  commUniqueNoMasked: string;
  ownerNameMasked: string;
  extractionOk: boolean;
  draftExpiresAt: string;
}
export interface GuestIdentityStartRequest {
  purpose: VerificationPurpose;
  guestName: string;
  guestPhone: string;
  draftId?: string;
}
/**
 * identity/start 응답의 launch — OTP 식별을 위해 `mode`를 추가한 상위호환 타입.
 * 런타임 계약은 기존 Record<string,string> 그대로이며, OTP launch는 이동 필드(url/action) 없이
 * `mode: "sms_otp"`와 `verificationId`만 담는다. 다날은 기존 URL/form 필드(mode 없음).
 */
export interface GuestIdentityLaunch {
  /** "sms_otp"면 OTP 흐름. 다날은 mode 없음 또는 "danal". */
  mode?: string;
  verificationId?: string;
  [key: string]: string | undefined; // 다날 url/action/returnUrl 등 기존 필드 호환
}
export interface GuestIdentityStartResponse {
  verificationId: string;
  launch: GuestIdentityLaunch;
  expiresAt: string;
}
/** §3.3 POST /identity/verify-otp 요청 — 숫자 6자리 "문자열"(앞자리 0 보존) */
export interface GuestOtpVerifyRequest {
  verificationId: string;
  code: string;
}
/** §3.3 verify-otp 성공 응답(비-2xx 실패는 기존 GuestApiError) */
export interface GuestOtpVerifyResponse {
  ok: true;
  purpose: "status" | "apply";
}
export interface GuestOrderRequest {
  purpose: GuestOrderPurpose;
  draftId?: string;
  guestMonitoringId?: string;
  idempotencyKey: string;
}
export interface GuestOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  payment: Record<string, string>;
  status: GuestOrderStatus;
}
export interface GuestOrderStateResponse {
  orderId: string;
  status: GuestOrderStatus;
  applied: boolean;
  startedAt: string | null;
  paidUntil: string | null;
}
export interface GuestPropertyDto {
  id: string;
  addressShort: string;
  status: "active" | "expired";
  startedAt: string;
  paidUntil: string;
}
export interface GuestCalendarResponse {
  property: GuestPropertyDto;
  month: string;
  logs: CheckLogItem[];
}

export interface GuestPaymentCallbackRequest {
  paymentId: string;
  callbackContext: string;
  callbackSignature: string;
}
export interface GuestPaymentCallbackResponse { ok: true }
