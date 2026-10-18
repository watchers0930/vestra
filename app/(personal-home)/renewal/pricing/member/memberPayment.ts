/**
 * 회원 선불 구독 — PortOne V1 결제 실행(설계 §5.1, 회원 전용 신규).
 *
 * 비회원 guestPayment.ts의 상태머신 패턴을 **차용**하되(재사용 아님), 회원 전용 DTO/경로로 독립 구현한다.
 * `IMP.init(impCode)` → `IMP.request_pay({ pg, pay_method:"card", merchant_uid, name, amount, m_redirect_url }, cb)`.
 *
 * 승인 판정의 유일 근거는 서버 REST 재조회다. SDK의 `success`는 "서버 확인 시작" 신호일 뿐이며,
 * imp_uid·서명·문맥을 URL/localStorage/sessionStorage에 저장하지 않고 모듈 메모리로만 전달한다(§5.1).
 *
 * PaymentOutcome(설계 §5.1):
 *  - redirected   : 모바일 리다이렉트 이탈 — 복귀 effect가 재개
 *  - confirm      : 인라인 성공 → 콜백 POST(imp_uid 포함)
 *  - recover      : 실행정보 없음/공급자 미지정 → 주문 상태 조회
 *  - canceled     : 사용자 닫기/취소 → 재조회(새 결제 금지)
 *  - unavailable  : request_pay 호출 전 중단(모듈/실행정보/금액) → 같은 주문에 retry_payment(출금 없음)
 *  - error        : request_pay 호출 이후 예외/실패 → 불명확 → 서버 재조회 먼저
 *  - aborted      : 로더 await 중 화면 이탈·세션 변경 감지로 결제창 미실행(무동작)
 */

import type { MemberPaymentCallbackRequest, MemberPaymentInfo } from "@/types/member-subscription";
import { loadPortOneV1, type PortOneV1Imp, type PortOneV1PayResponse } from "./portoneV1Loader";

export type PaymentOutcome =
  | { kind: "redirected" }
  | { kind: "confirm"; callback: MemberPaymentCallbackRequest }
  | { kind: "recover" }
  | { kind: "canceled" }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string }
  | { kind: "aborted" };

const MSG_INFO = "결제 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
const MSG_AMOUNT = "결제 금액 정보가 올바르지 않습니다. 다시 시도해 주세요.";
const MSG_MODULE = "결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
const MSG_FAILED = "결제가 완료되지 않았습니다. 주문 상태를 확인해 주세요.";
const MSG_ERROR = "결제 중 오류가 발생했습니다. 주문 상태를 확인해 주세요.";

/**
 * 승인 후 콜백 유실 복구용 "인메모리" 콜백 문맥 저장(§5.1 — 메모리 유지, 저장소 금지).
 * imp_uid·서명 echo는 PII가 아니며 로그·전송 대상이 아니다. 완료/실패 확정 시 제거한다.
 * 새로고침으로 메모리가 사라지면 서버 복구 경로(merchant_uid 조회·cron)가 처리한다(§4.9).
 */
const callbackMemory = new Map<string, MemberPaymentCallbackRequest>();

export function rememberCallback(orderId: string, callback: MemberPaymentCallbackRequest): void {
  if (orderId) callbackMemory.set(orderId, callback);
}
export function recallCallback(orderId: string): MemberPaymentCallbackRequest | null {
  return callbackMemory.get(orderId) ?? null;
}
export function forgetCallback(orderId: string): void {
  callbackMemory.delete(orderId);
}

/**
 * 진행 중 주문의 **orderId(merchant_uid)만** 세션 스토리지에 보존한다. 401 재인증(화면 이탈로
 * 모듈 메모리 소실) 후 돌아왔을 때 서버 멱등 복구(merchant_uid 조회·재검증, §4.9)를 이어가기 위함이다.
 * ⚠️ imp_uid·서명·callbackContext는 저장하지 않는다(§5.1). orderId는 서버 식별자이며 모바일 복귀 URL에도
 * 노출되는 비민감 값이다. 서버가 merchant_uid로 imp_uid를 재조회·재검증하므로 결제 자격증명은 불필요하다.
 */
const PENDING_ORDER_KEY = "vestra_member_pending_order";
export function rememberPendingOrderId(orderId: string): void {
  if (typeof window === "undefined" || !orderId) return;
  try { window.sessionStorage.setItem(PENDING_ORDER_KEY, orderId); } catch { /* storage unavailable */ }
}
export function recallPendingOrderId(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage.getItem(PENDING_ORDER_KEY) || null; } catch { return null; }
}
export function forgetPendingOrderId(): void {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(PENDING_ORDER_KEY); } catch { /* ignore */ }
}

/** 사용자 닫기/취소로 보이는 응답인지(취소 vs 에러 구분 — 둘 다 서버 재조회로 수렴). error_msg 원문은 UI/로그 비노출. */
function looksCanceled(res: PortOneV1PayResponse): boolean {
  const s = `${res.error_code ?? ""} ${res.error_msg ?? ""}`.toUpperCase();
  return /CANCEL|CLOSE|USER|취소|닫|중단|중지/.test(s);
}

/**
 * PortOne V1 결제 실행(설계 §5.1). 서버 발급 `payment` 객체(전부 문자열)를 그대로 사용한다.
 * @param payment      POST /orders 응답의 payment 객체(MemberPaymentInfo).
 * @param shouldCancel 로더 await 직후 결제창을 열기 직전 호출하는 취소 판정(화면 이탈·세션 변경 시 true).
 */
export async function runPayment(
  payment: MemberPaymentInfo | Record<string, never>,
  shouldCancel?: () => boolean
): Promise<PaymentOutcome> {
  if (!payment || typeof payment !== "object" || !("provider" in payment)) {
    // 실행 정보 없음(재사용/적용된 주문 등) → 주문 상태 조회로 복구(새 결제 금지).
    return { kind: "recover" };
  }
  const p = payment as MemberPaymentInfo;
  const { impCode, pg, payMethod, paymentId, orderName, amount, redirectPath, callbackContext, callbackSignature } = p;

  // 실행 정보가 하나라도 비면 결제창을 띄우지 않는다(§5.1). 아직 실행 전이므로 unavailable.
  if (!impCode || !pg || !payMethod || !paymentId || !callbackContext || !callbackSignature) {
    return { kind: "unavailable", message: MSG_INFO };
  }
  // 금액: Number() 변환 전 정수 검증(§5.1). 서버 금액 재결정이 원천이므로 고정 기대값은 두지 않는다.
  if (!/^\d+$/.test(amount)) {
    return { kind: "unavailable", message: MSG_AMOUNT };
  }

  // CDN script 로드 + window.IMP 확보. 실패/timeout/IMP 미존재 → unavailable(로더가 캐시 초기화, §4.9).
  let imp: PortOneV1Imp;
  try {
    imp = await loadPortOneV1();
    imp.init(impCode);
  } catch {
    return { kind: "unavailable", message: MSG_MODULE };
  }

  // 로더 await(최대 10s)·init 동안 화면 이탈·세션 변경이 있었으면 결제창을 열지 않는다(§4.9 실행 취소).
  if (shouldCancel?.()) return { kind: "aborted" };

  // m_redirect_url: 서버가 내려준 same-origin 복귀 경로로 고정(외부 입력 금지, §5.1).
  const mRedirectUrl =
    typeof window !== "undefined" ? `${window.location.origin}${redirectPath}` : undefined;

  return new Promise<PaymentOutcome>((resolve) => {
    let done = false;
    const finish = (outcome: PaymentOutcome) => {
      if (done) return;
      done = true;
      resolve(outcome);
    };
    try {
      imp.request_pay(
        {
          pg,
          pay_method: "card",
          merchant_uid: paymentId,
          name: orderName,
          amount: Number(amount), // 정수 검증 후 변환
          ...(mRedirectUrl ? { m_redirect_url: mRedirectUrl } : {}),
        },
        (res: PortOneV1PayResponse) => {
          if (res?.success === true) {
            // success는 서버 확인 시작 신호. imp_uid 필수 + merchant_uid 정확 일치 확인(위변조/혼선 방어, §5.1).
            if (!res.imp_uid || res.merchant_uid !== paymentId) {
              finish({ kind: "error", message: MSG_FAILED });
              return;
            }
            finish({
              kind: "confirm",
              callback: { paymentId, imp_uid: res.imp_uid, callbackContext, callbackSignature },
            });
            return;
          }
          // success !== true: 닫기/취소성은 canceled, 그 외는 error(둘 다 서버 재조회로 수렴).
          finish(looksCanceled(res ?? {}) ? { kind: "canceled" } : { kind: "error", message: MSG_FAILED });
        }
      );
    } catch {
      // request_pay 호출 자체 예외 — 실행이 시작됐을 수 있어 불명확 → error(서버 상태가 판정).
      finish({ kind: "error", message: MSG_ERROR });
    }
  });
}

/**
 * 모바일 복귀 쿼리를 **제거하지 않고** 들여다본다(§4.9). 세션 미복구 상태에서 식별자를 지우면 재로그인 후
 * 복구 단서가 사라지므로, authenticated 확정 전에는 peek만 하고 제거는 readV1RedirectReturn로 미룬다.
 */
export function peekV1RedirectReturn(): { impUid: string | null; merchantUid: string | null } {
  if (typeof window === "undefined") return { impUid: null, merchantUid: null };
  const q = new URLSearchParams(window.location.search);
  return { impUid: q.get("imp_uid") || null, merchantUid: q.get("merchant_uid") || null };
}

/**
 * 모바일 리다이렉트 복귀 쿼리에서 V1 식별자(imp_uid/merchant_uid)를 읽고, 읽은 뒤 URL에서 제거한다(§4.9).
 * 공급자가 준 값은 미신뢰 입력이며 서버가 REST로 검증한다. URL에 서명·nonce·PII를 추가·보존하지 않는다.
 */
export function readV1RedirectReturn(): { impUid: string | null; merchantUid: string | null } {
  if (typeof window === "undefined") return { impUid: null, merchantUid: null };
  const q = new URLSearchParams(window.location.search);
  const impUid = q.get("imp_uid");
  const merchantUid = q.get("merchant_uid");
  if (impUid || merchantUid || q.get("imp_success") || q.get("success")) {
    for (const k of ["imp_uid", "merchant_uid", "imp_success", "success", "error_code", "error_msg"]) {
      q.delete(k);
    }
    const qs = q.toString();
    const url = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    try {
      window.history.replaceState(null, "", url);
    } catch {
      /* replaceState 불가 환경 — 식별자 제거 실패해도 서버가 최종 검증 */
    }
  }
  return { impUid: impUid || null, merchantUid: merchantUid || null };
}
