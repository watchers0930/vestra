/**
 * 비회원 신청 실패 분류 — 순수 함수(설계 §6.3).
 *
 * `needsFreshPayment` 단일 불리언으로 모든 실패를 표현하지 않는다(§6.3). API/주문 상태 신호를
 * 아래 동작으로 분류하고, 훅의 retry/표시가 "해당 동작만" 수행한다. 이 파일은 React·DOM·네트워크에
 * 의존하지 않는 순수 로직이며, 메시지는 사용자용 일반 안내(내부 사유·원문 결제정보 비노출)다.
 */

export type FailureKind =
  | "reauth" // 401 — 세션 만료. SMS 재인증. 재인증 전 startOrder 금지, 주문·멱등키 유지
  | "reparse" // 404·draft_expired — 초안/주문 재개 참조 폐기, PDF 재파싱
  | "retry_same" // network(status=0)·429·503 — 입력·동일 멱등키 유지. 주문 전송 실패면 재전송,
  //              주문이 이미 있으면 SDK 재실행 없이 재조회/콜백 재전송(버그⑤)
  | "retry_payment" // SDK 미실행 중단(모듈/실행정보/금액) — 같은 주문에 결제창 재실행(출금 전이라 안전)
  | "resend_callback" // 승인됐으나 콜백 유실로 주문 pending — 동일 문맥 콜백 재전송(SDK 재실행 아님, 버그②③)
  | "recheck" // paid미적용·needs_review·payment_pending — 주문 재조회만(새 결제·콜백 재전송 금지)
  | "fresh_payment" // 서버 확정 failed/canceled/refunded — clearOrder 후 새 멱등키
  | "blocked" // 상점·금액·서명 불일치, 403 보안 거부 — 결제 중단, 자동 재결제 금지
  | "conflict"; // 409 중복 활성 등 업무 충돌 — 현황 조회 안내, 무조건 새 키 재시도 금지

export interface FailureAction {
  kind: FailureKind;
  /** 특정 거부 사유의 사용자용 문구 오버라이드(예: owner_name_mismatch). 없으면 kind 기본 문구 사용. */
  message?: string;
}

/**
 * API 실패(createOrder·getOrderState·paymentCallback) → 동작 분류.
 * code 우선(`draft_expired`·`payment_pending`은 HTTP 상태와 무관), 그다음 status.
 * '비401 결제 실패'는 서버 확정(주문 상태)만 새 결제로 본다 → payment_failed(400)는 blocked.
 */
export function classifyApiFailure(status: number, code: string): FailureAction {
  if (status === 401) return { kind: "reauth" };
  if (code === "draft_expired") return { kind: "reparse" };
  if (code === "payment_pending") return { kind: "recheck" };
  if (status === 404) return { kind: "reparse" };
  if (status === 0 || status === 429 || status === 503) return { kind: "retry_same" };
  // 소유자 대조 실패(role=owner인데 guestName≠ownerName, 설계 §3.4/§4.5): 결제 진입 차단 + 지정 문구.
  if (code === "owner_name_mismatch") return { kind: "blocked", message: "본인 소유 물건이 아닙니다." };
  if (status === 403) return { kind: "blocked" };
  if (status === 409) return { kind: "conflict" };
  // 400 payment_failed(불일치/서명/nonce) 등 결제 확정 거부 → 중단(자동 재결제 금지)
  return { kind: "blocked" };
}

/** 사용자용 일반 안내 메시지(내부 사유·원문 결제정보·secret 비노출). */
export function failureMessage(action: FailureAction): string {
  // 특정 거부 사유(owner_name_mismatch 등)는 서버 계약 문구를 우선 노출한다.
  if (action.message) return action.message;
  switch (action.kind) {
    case "reauth":
      return "인증이 만료되었습니다. 본인인증을 다시 진행해 주세요.";
    case "reparse":
      return "신청 정보가 만료되었습니다. 등기부등본을 다시 올려 주세요.";
    case "retry_same":
      return "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    case "retry_payment":
      return "결제를 완료하지 못했습니다. 다시 결제를 진행해 주세요.";
    case "resend_callback":
    case "recheck":
      return "결제 결과를 확인하고 있습니다. 잠시 후 다시 확인해 주세요.";
    case "fresh_payment":
      return "결제가 완료되지 않았습니다. 다시 결제를 진행해 주세요.";
    case "conflict":
      return "이미 처리 중인 신청이 있습니다. 신청 현황을 확인해 주세요.";
    case "blocked":
    default:
      return "결제를 완료하지 못했습니다. 다시 시도해 주세요.";
  }
}
