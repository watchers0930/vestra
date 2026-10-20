/**
 * 회원 선불 구독 — PortOne V2 결제 실행(설계 §5.1, V1→V2 전환).
 *
 * 비회원 guestPayment.ts의 상태머신 패턴을 **차용**하되(재사용 아님), 회원 전용 DTO/경로로 독립 구현한다.
 * `PortOne.requestPayment({ storeId, channelKey, paymentId, orderName, totalAmount, currency, payMethod, redirectUrl })`.
 * V2는 식별자가 paymentId 단일(= 서버 orderId)이며 V1의 imp_uid/merchant_uid 분리가 없다.
 *
 * 승인 판정의 유일 근거는 서버 REST 재조회(GET /payments/{paymentId})다. SDK가 반환하는 성공은
 * "서버 확인 시작" 신호일 뿐이며, paymentId·서명·문맥을 localStorage/sessionStorage에 저장하지 않고
 * 모듈 메모리로만 전달한다(§5.1). 콜백 DTO의 imp_uid 필드는 V2 paymentId 값을 운반한다(서버 호환).
 *
 * PaymentOutcome(설계 §5.1):
 *  - redirected   : 모바일 리다이렉트 이탈 — 복귀 effect가 재개
 *  - confirm      : 인라인 성공 → 콜백 POST(paymentId 포함)
 *  - recover      : 실행정보 없음/공급자 미지정 → 주문 상태 조회
 *  - canceled     : 사용자 닫기/취소 → 재조회(새 결제 금지)
 *  - unavailable  : requestPayment 호출 전 중단(모듈/실행정보/금액) → 같은 주문에 retry_payment(출금 없음)
 *  - error        : requestPayment 호출 이후 예외/실패 → 불명확 → 서버 재조회 먼저
 *  - aborted      : 로더 await 중 화면 이탈·세션 변경 감지로 결제창 미실행(무동작)
 */

import type { MemberPaymentCallbackRequest, MemberPaymentInfo } from "@/types/member-subscription";
import { loadPortOneV2, type PortOneV2Sdk, type PortOneV2PayResponse } from "./portoneV2Loader";

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

/** 사용자 닫기/취소로 보이는 응답인지(취소 vs 에러 구분 — 둘 다 서버 재조회로 수렴). code/message 원문은 UI/로그 비노출. */
function looksCanceled(res: PortOneV2PayResponse): boolean {
  const s = `${res.code ?? ""} ${res.message ?? ""}`.toUpperCase();
  return /CANCEL|CLOSE|USER|ABORT|취소|닫|중단|중지/.test(s);
}

/**
 * PortOne V2 결제 실행(설계 §5.1). 서버 발급 `payment` 객체(전부 문자열)를 그대로 사용한다.
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
  const { storeId, channelKey, payMethod, paymentId, orderName, amount, redirectPath, callbackContext, callbackSignature } = p;

  // 실행 정보가 하나라도 비면 결제창을 띄우지 않는다(§5.1). 아직 실행 전이므로 unavailable.
  if (!storeId || !channelKey || !payMethod || !paymentId || !callbackContext || !callbackSignature) {
    return { kind: "unavailable", message: MSG_INFO };
  }
  // 금액: Number() 변환 전 정수 검증(§5.1). 서버 금액 재결정이 원천이므로 고정 기대값은 두지 않는다.
  if (!/^\d+$/.test(amount)) {
    return { kind: "unavailable", message: MSG_AMOUNT };
  }

  // V2 SDK 모듈 확보(동적 import). 실패 → unavailable(로더가 캐시 초기화, §4.9).
  let sdk: PortOneV2Sdk;
  try {
    sdk = await loadPortOneV2();
  } catch {
    return { kind: "unavailable", message: MSG_MODULE };
  }

  // 로더 await 동안 화면 이탈·세션 변경이 있었으면 결제창을 열지 않는다(§4.9 실행 취소).
  if (shouldCancel?.()) return { kind: "aborted" };

  // redirectUrl: 서버가 내려준 same-origin 복귀 경로로 고정(외부 입력 금지, §5.1). 모바일 리다이렉트 필수.
  const redirectUrl =
    typeof window !== "undefined" ? `${window.location.origin}${redirectPath}` : undefined;

  // V2 requestPayment는 Promise 기반. 모바일은 redirectUrl로 이탈하며 이 Promise는 resolve되지 않을 수 있다
  // (페이지 언로드) → 복귀 effect가 재개. 데스크톱은 iframe/popup 후 resolve된다.
  let res: PortOneV2PayResponse | undefined;
  try {
    res = await sdk.requestPayment({
      storeId,
      channelKey,
      paymentId,
      orderName,
      totalAmount: Number(amount), // 정수 검증 후 변환
      currency: "CURRENCY_KRW",
      payMethod: "CARD",
      ...(redirectUrl ? { redirectUrl } : {}),
    });
  } catch {
    // requestPayment 호출 이후 예외 — 실행이 시작됐을 수 있어 불명확 → error(서버 상태가 판정).
    return { kind: "error", message: MSG_ERROR };
  }

  // 응답 없음(undefined) → 불명확 → error(서버 재조회로 수렴).
  if (!res) return { kind: "error", message: MSG_FAILED };
  // code 존재 = 실패/취소. 닫기/취소성은 canceled, 그 외는 error(둘 다 서버 재조회로 수렴).
  if (res.code != null) {
    return looksCanceled(res) ? { kind: "canceled" } : { kind: "error", message: MSG_FAILED };
  }
  // 성공: paymentId 필수 + 서버 주문과 정확 일치 확인(위변조/혼선 방어, §5.1).
  if (!res.paymentId || res.paymentId !== paymentId) {
    return { kind: "error", message: MSG_FAILED };
  }
  // 콜백 DTO의 imp_uid 필드는 V2 paymentId 값을 운반한다(서버 verifyMemberPayment 호환).
  return {
    kind: "confirm",
    callback: { paymentId, imp_uid: res.paymentId, callbackContext, callbackSignature },
  };
}

/**
 * 모바일 복귀 쿼리를 **제거하지 않고** 들여다본다(§4.9). 세션 미복구 상태에서 식별자를 지우면 재로그인 후
 * 복구 단서가 사라지므로, authenticated 확정 전에는 peek만 하고 제거는 readV1RedirectReturn로 미룬다.
 * V2는 식별자가 paymentId 단일(= orderId)이라 impUid·merchantUid 모두 paymentId를 담아 반환한다
 * (호출 훅 인터페이스 유지: merchantUid=orderId, impUid=recover 후보=orderId).
 */
export function peekV1RedirectReturn(): { impUid: string | null; merchantUid: string | null } {
  if (typeof window === "undefined") return { impUid: null, merchantUid: null };
  const q = new URLSearchParams(window.location.search);
  const paymentId = q.get("paymentId") || null;
  return { impUid: paymentId, merchantUid: paymentId };
}

/**
 * 모바일 리다이렉트 복귀 쿼리에서 V2 식별자(paymentId)를 읽고, 읽은 뒤 URL에서 제거한다(§4.9).
 * 공급자가 준 값은 미신뢰 입력이며 서버가 REST로 검증한다. URL에 서명·nonce·PII를 추가·보존하지 않는다.
 */
export function readV1RedirectReturn(): { impUid: string | null; merchantUid: string | null } {
  if (typeof window === "undefined") return { impUid: null, merchantUid: null };
  const q = new URLSearchParams(window.location.search);
  const paymentId = q.get("paymentId");
  if (paymentId || q.get("code") || q.get("txId") || q.get("transactionType")) {
    for (const k of ["paymentId", "code", "message", "txId", "transactionType", "pgCode", "pgMessage"]) {
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
  return { impUid: paymentId || null, merchantUid: paymentId || null };
}
