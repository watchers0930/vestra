/** 무료회원 단건 등기감시 결제/활성화 에러. guest-monitoring 패턴과 동일한 코드 규약. */
export class SingleError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}
export function singleUnavailable(): never { throw new SingleError("provider_unavailable", 503); }

export const singleMessages: Record<string, string> = {
  not_found: "요청한 정보를 확인할 수 없습니다.",
  unauthorized: "로그인 후 다시 이용해주세요.",
  single_limit: "이미 단건 감시 중인 물건이 있습니다. 동시 1건까지 이용할 수 있습니다.",
  duplicate_active: "이미 감시 중인 주소입니다.",
  invalid_input: "입력 내용을 확인해주세요.",
  provider_unavailable: "현재 결제를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.",
  payment_failed: "결제를 확인할 수 없습니다. 주문 상태를 확인해주세요.",
  payment_needs_review: "결제는 확인되었으나 서비스 적용 확인이 필요합니다. 고객센터에 문의해주세요.",
};
