export class GuestError extends Error {
  constructor(public code: string, public status = 400, public headers?: Record<string, string>) {
    super(code);
  }
}
export function unavailable(): never { throw new GuestError("provider_unavailable", 503); }
export function notFound(): never { throw new GuestError("not_found", 404); }
export const messages: Record<string, string> = {
  not_found: "요청한 정보를 확인할 수 없습니다.",
  session_required: "본인인증 후 다시 이용해주세요.",
  invalid_input: "입력 내용을 확인해주세요.",
  verification_failed: "인증번호를 확인해주세요. 번호가 올바르지 않거나 시간이 만료되었을 수 있습니다.",
  invalid_pdf: "유효한 등기부 PDF를 업로드해주세요.",
  not_registry: "등기부등본 PDF를 업로드해주세요.",
  multiple_properties: "한 물건의 등기부등본만 업로드해주세요.",
  extraction_incomplete: "고유번호와 소유자를 확인할 수 없습니다. PDF를 확인해주세요.",
  address_mismatch: "입력 주소와 등기부 주소가 일치하지 않습니다.",
  file_too_large: "10MB 이하 PDF를 업로드해주세요.",
  rate_limited: "요청이 많습니다. 잠시 후 다시 시도해주세요.",
  draft_expired: "신청 시간이 만료되었습니다. PDF를 다시 등록해주세요.",
  duplicate_active: "이미 감시 중인 물건입니다. 현황 조회에서 연장해주세요.",
  provider_unavailable: "현재 인증 또는 결제를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.",
  forbidden: "요청을 확인할 수 없습니다.",
  payment_pending: "결제 승인을 확인하고 있습니다. 주문 상태를 다시 확인해주세요.",
  payment_failed: "결제를 확인할 수 없습니다. 주문 상태를 확인해주세요.",
  payment_needs_review: "결제는 확인되었으나 서비스 적용 확인이 필요합니다. 고객센터에 문의해주세요.",
};
