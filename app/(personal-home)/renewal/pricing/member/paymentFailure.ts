/**
 * 회원 구독 결제 실패 분류 — 순수 함수(설계 §4.9).
 *
 * 단일 불리언으로 실패를 뭉개지 않는다. API/주문 상태 신호를 아래 동작으로 분류하고, 훅의 retry/표시가
 * "해당 동작만" 수행한다. React·DOM·네트워크에 의존하지 않는 순수 로직이며, 메시지는 사용자용 일반
 * 안내(내부 사유·원문 결제정보·시크릿 비노출, §4.10)다.
 *
 * 설계 §4.9 매핑:
 *  - 세션 401 → 재로그인 후 기존 주문 재개(주문·멱등키 보존)
 *  - pending(payment_pending/needs_review)·409/429/503/네트워크 → 재조회
 *  - 400/403/404 영구 거부 → 안내 보존(GET pending이 영구 거부를 승인 대기로 덮어쓰기 금지)
 */

export type FailureKind =
  | "reauth" // 401 — 세션 만료. 재로그인. 재로그인 전 새 주문 금지, 주문·멱등키 유지
  | "retry_same" // network(status=0)·429·503 — 동일 멱등키 유지. 주문 전송 실패면 재전송, 주문 있으면 복구
  | "retry_payment" // SDK 미실행 중단(모듈/실행정보/금액) — 같은 주문에 결제창 재실행(출금 전이라 안전)
  | "recheck" // payment_pending·paid 미적용 — 공급자 재검증·적용 복구(recover) 대상(새 결제·콜백 재전송 금지)
  | "review" // needs_review — 수동 검토 대기. 콜백·복구 재시도로 해제되지 않음(§4.4)
  | "terminal" // failed/canceled/refunded 확정 — 재시도 불가, 새 구매로만 진행(§4.9)
  | "blocked" // 400 payment_failed·403 보안·404 부재·500 설정 — 결제 중단, 자동 재결제 금지
  | "conflict"; // 409 중복/멱등/플랜변경/거래충돌 등 업무 충돌 — 현황 조회 안내, 무조건 새 키 재시도 금지

export interface FailureAction {
  kind: FailureKind;
}

/**
 * API 실패(createOrder·getOrderState·paymentCallback·recover) → 동작 분류.
 * code 우선(`payment_pending`·`payment_needs_review`는 재조회), 그다음 status.
 * '비401 결제 실패'는 서버 확정만 중단으로 본다 → payment_failed(400)는 blocked.
 */
export function classifyApiFailure(status: number, code: string): FailureAction {
  if (status === 401) return { kind: "reauth" };
  // needs_review는 수동 큐 대기 — 콜백·복구 재전송으로 해제되지 않으므로 recheck와 구별한다(§4.4).
  if (code === "payment_needs_review") return { kind: "review" };
  if (code === "payment_pending") return { kind: "recheck" };
  if (status === 0 || status === 429 || status === 503) return { kind: "retry_same" };
  if (status === 403) return { kind: "blocked" };
  if (status === 404) return { kind: "blocked" };
  if (status === 409) return { kind: "conflict" };
  // 400 payment_failed/invalid_input/invalid_duration, 500 config_error 등 확정 거부 → 중단(자동 재결제 금지)
  return { kind: "blocked" };
}

/** 사용자용 일반 안내 메시지(내부 사유·원문 결제정보·secret 비노출). */
export function failureMessage(action: FailureAction, serverError?: string): string {
  switch (action.kind) {
    case "reauth":
      return "로그인이 만료되었습니다. 다시 로그인한 뒤 이어서 진행해 주세요.";
    case "retry_same":
      return "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    case "retry_payment":
      return "결제를 시작하지 못했습니다. 다시 결제를 진행해 주세요.";
    case "recheck":
      return "결제 결과를 확인하고 있습니다. 잠시 후 다시 확인해 주세요.";
    case "review":
      return "결제 확인에 추가 검토가 필요합니다. 처리가 끝날 때까지 잠시 기다려 주세요. 문제가 계속되면 고객지원에 문의해 주세요.";
    case "terminal":
      // 확정 종료(취소/실패/환불) 상태별 안내는 호출부에서 serverError로 주입한다.
      return serverError || "이 주문은 더 이상 진행할 수 없습니다. 새로 구매를 진행해 주세요.";
    case "conflict":
      // 서버가 내려준 업무 사유(예: 이용 기간 중 플랜 변경 불가)는 그대로 안내해도 안전(시크릿 아님).
      return serverError || "요청을 처리할 수 없습니다. 구독 현황을 확인해 주세요.";
    case "blocked":
    default:
      return serverError || "결제를 완료하지 못했습니다. 다시 시도해 주세요.";
  }
}
