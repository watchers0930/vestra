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
export interface GuestIdentityStartResponse {
  verificationId: string;
  launch: Record<string, string>;
  expiresAt: string;
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
