export const MEMBER_ERRORS = {
  invalid_input: [400, "입력값을 확인해 주세요."],
  invalid_duration: [400, "선택할 수 없는 구독 기간입니다."],
  unauthorized: [401, "로그인이 필요합니다."],
  forbidden: [403, "허용되지 않은 요청입니다."],
  plan_not_allowed: [403, "선택할 수 없는 상품입니다."],
  verification_required: [403, "사업자 인증을 먼저 완료해 주세요."],
  not_found: [404, "주문을 찾을 수 없습니다."],
  trial_already_used: [409, "이미 체험을 이용했거나 이용 중인 구독이 있습니다."],
  idempotency_conflict: [409, "기존 주문과 요청 내용이 다릅니다."],
  plan_change_not_allowed: [409, "이용 기간 중에는 같은 플랜만 연장할 수 있습니다."],
  payment_failed: [400, "결제 정보를 확인할 수 없습니다."],
  payment_pending: [409, "결제 확인 중입니다. 잠시 후 다시 조회해 주세요."],
  payment_needs_review: [409, "결제 확인에 추가 검토가 필요합니다."],
  transaction_conflict: [409, "다른 주문에 연결된 결제입니다."],
  rate_limited: [429, "요청이 많습니다. 잠시 후 다시 시도해 주세요."],
  payload_too_large: [413, "요청 크기가 너무 큽니다."],
  provider_unavailable: [503, "현재 구독 결제를 이용할 수 없습니다."],
  config_error: [500, "구독 설정을 확인 중입니다."],
} as const;
export type MemberErrorCode = keyof typeof MEMBER_ERRORS;
export class MemberError extends Error {
  readonly status: number;
  constructor(readonly code: MemberErrorCode, readonly headers?: Record<string, string>) {
    super(MEMBER_ERRORS[code][1]);
    this.status = MEMBER_ERRORS[code][0];
  }
}
export class MemberConfigError extends MemberError {
  constructor(reason: string) { super("config_error"); void reason; }
}
export function fail(code: MemberErrorCode): never { throw new MemberError(code); }
/** Never propagate the plumbing's guest error, raw response, or exception text. */
export async function providerBoundary<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof MemberError) throw error;
    if (error && typeof error === "object" && "code" in error) {
      // Allow only known permanent/review outcomes; never forward provider text.
      if (error.code === "payment_failed" || error.code === "not_found" || error.code === "payment_needs_review") {
        return fail(error.code);
      }
    }
    return fail("provider_unavailable");
  }
}
