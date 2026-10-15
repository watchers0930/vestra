/**
 * 비회원 등기감시 — 결제 실행 헬퍼(설계 §5.1, PortOne V1 다날 카드).
 *
 * 책임: 서버 orders 응답의 `payment`(V1 SDK 실행 정보 + 서명 문맥)를 받아 공급자별로 결제를 실행하고,
 * 그 결과를 판별 유니온(PaymentOutcome)으로 반환한다. UI/상태 전이는 훅(useGuestOrderFlow/useGuestRenew)이
 * 담당하며, 이 파일은 "결제 프로토콜"만 책임진다(페이지·컴포넌트에 결제 프로토콜 금지, 절대규칙 §2).
 *
 * 신뢰 경계(§1.1):
 *   - SDK 반환(브라우저 금액·success·시각·imp_uid)은 신뢰하지 않는다. success는 "콜백 POST 필요"로만 환산한다.
 *   - 완료(done) 판정은 서버 주문 상태(paid && applied)가 유일 근거 → 호출부가 재조회로 확정한다.
 *   - 서명/nonce/개인정보를 URL·localStorage·sessionStorage에 저장하지 않는다(콜백 문맥은 메모리 전달).
 */

import type { GuestOrderStateResponse } from "@/types/guest-monitoring";
import {
  createOrder,
  getOrderState,
  paymentCallback,
  type GuestPaymentCallbackRequest,
} from "./guestApi";
import { launchProvider, GUEST_APPLY_PATH } from "./guestProvider";
import { loadPortOneV1, type PortOneV1Imp, type PortOneV1PayResponse } from "./portoneV1Loader";
import { classifyApiFailure } from "./applyFailure";

/**
 * 결제 실행 결과(§5.1). UI 세부는 호출부가 결정한다.
 *  - redirected  : 페이지 이탈(모바일 리다이렉트) → 복귀 시 effect가 재개
 *  - confirm     : SDK 인라인 성공 → 서명 문맥 + imp_uid로 콜백 POST 필요
 *  - recover     : 실행 정보 없음(mock 즉시완료 등) → 주문 상태 조회로 복구
 *  - canceled    : 사용자 닫기/취소 → 재조회(승인 불명확 → 새 결제 금지)
 *  - unavailable : 결제창을 띄우기 전 중단(script 로드 실패·IMP 미존재·실행정보 미비·금액 불일치). 결제
 *                  시도가 일어나지 않았으므로 "승인 대기"로 덮지 않고 오류를 유지한다. 같은 주문에 SDK를
 *                  다시 실행해도 안전(출금 없음) → 호출부는 retry_payment로 재실행 유도(§4.7).
 *  - error       : request_pay 호출 이후 예외/실패 — 실행이 시작됐을 수 있어 불명확 → 서버 상태가 판정(재조회 먼저)
 *  - aborted     : 로더 await(최대 10s) 중 화면 이탈·reset·세션 변경이 감지되어 결제창을 열지 않고 중단
 *                  (§4.7 실행 취소). 출금이 전혀 없었고 호출부는 세대 가드로 상태 전이도 하지 않는다(무동작).
 */
export type PaymentOutcome =
  | { kind: "redirected" }
  | { kind: "confirm"; callback: GuestPaymentCallbackRequest }
  | { kind: "recover" }
  | { kind: "canceled" }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string }
  | { kind: "aborted" };

/** 가격 SSOT는 서버(lib/pricing-plans). 클라이언트는 SDK 경계 정합성 확인용으로만 기대값을 둔다(§5.1). */
const EXPECTED_AMOUNT = 10000;
const ORDER_NAME = "등기감시 1개월";

const MSG_INFO = "결제 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
const MSG_AMOUNT = "결제 금액 정보가 올바르지 않습니다. 다시 시도해 주세요.";
const MSG_MODULE = "결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
const MSG_FAILED = "결제가 완료되지 않았습니다. 주문 상태를 확인해 주세요.";
const MSG_ERROR = "결제 중 오류가 발생했습니다. 주문 상태를 확인해 주세요.";

/**
 * 승인 후 콜백 유실 복구용 "인메모리" 콜백 문맥 저장(설계 §4.6 PC 인라인 — 메모리 유지, 저장소 금지).
 *
 * SDK 인라인 성공(confirm)의 콜백 문맥(imp_uid + 서명)은 최초 콜백 POST가 네트워크·503·429·payment_pending
 * 으로 유실되면 재시도에 그대로 다시 써야 한다. imp_uid·서명은 URL·localStorage·sessionStorage에 두지
 * 않으므로(§1.1/§5.1) 주문 ID(=paymentId)별로 모듈 메모리에만 보존하고, 완료/실패 확정 시 제거한다.
 * 새로고침으로 모듈 메모리가 사라지면 imp_uid까지 유실된 것으로 보고 서버 복구 경로(merchant_uid 조회·cron)가
 * 처리한다(§4.6). PII가 아닌 PG 거래 식별자/서명 echo만 담으며 로그·전송 대상이 아니다.
 */
const callbackMemory = new Map<string, GuestPaymentCallbackRequest>();

export function rememberCallback(orderId: string, callback: GuestPaymentCallbackRequest): void {
  if (orderId) callbackMemory.set(orderId, callback);
}
export function recallCallback(orderId: string): GuestPaymentCallbackRequest | null {
  return callbackMemory.get(orderId) ?? null;
}
export function forgetCallback(orderId: string): void {
  callbackMemory.delete(orderId);
}

/**
 * 사용자 닫기/취소로 보이는 응답인지(취소 vs 에러 구분 — 둘 다 서버 재조회로 수렴).
 * error_msg 원문은 UI·로그에 노출하지 않고 분류 판단에만 쓴다(§4.5).
 */
function looksCanceled(res: PortOneV1PayResponse): boolean {
  const s = `${res.error_code ?? ""} ${res.error_msg ?? ""}`.toUpperCase();
  return /CANCEL|CLOSE|USER|취소|닫|중단|중지/.test(s);
}

/**
 * PortOne V1 결제 실행(설계 §5.1). payment Record는 전부 문자열(§2.4.1).
 * `IMP.init(impCode)` → `IMP.request_pay({ pg, pay_method:"card", merchant_uid, name, amount, buyer_tel,
 * m_redirect_url }, cb)`. 콜백은 request_pay가 호출(모바일은 m_redirect_url로 리다이렉트되어 콜백 미호출).
 */
async function runPortOneV1(
  payment: Record<string, string>,
  redirectPath: string,
  memoryPhone?: string,
  shouldCancel?: () => boolean
): Promise<PaymentOutcome> {
  const { impCode, pg, payMethod, paymentId, amount, callbackContext, callbackSignature } = payment;

  // 실행 정보가 하나라도 비면 결제창을 띄우지 않는다(§5.1). 아직 실행 전이므로 unavailable
  // (승인 대기로 덮지 않고 오류 유지 + 같은 주문 재실행 허용).
  if (!impCode || !pg || !payMethod || !paymentId || !callbackContext || !callbackSignature) {
    return { kind: "unavailable", message: MSG_INFO };
  }
  // 금액: Number() 변환 전 정수 검증(§5.1). 서버 SSOT(10000)와 경계 정합성까지 확인.
  if (!/^\d+$/.test(amount) || Number(amount) !== EXPECTED_AMOUNT) {
    return { kind: "unavailable", message: MSG_AMOUNT };
  }

  // CDN script 로드 + window.IMP 확보. 실패/timeout/IMP 미존재 → unavailable(로더가 캐시 초기화, §4.7).
  let imp: PortOneV1Imp;
  try {
    imp = await loadPortOneV1();
    imp.init(impCode);
  } catch {
    return { kind: "unavailable", message: MSG_MODULE };
  }

  // 로더 await(최대 10s)·init 동안 화면 이탈·reset·세션 변경이 있었으면 결제창을 열지 않는다(§4.7 실행 취소).
  // 공유 script 로드와 "개별 결제 실행"의 수명을 분리 — 늦게 완료된 로드가 무관한 결제창을 띄우지 못하게 한다.
  if (shouldCancel?.()) return { kind: "aborted" };

  // buyer_tel: 메모리(OTP 입력) 또는 소유권 확인 서버가 내려준 값. 저장소·URL에 보관하지 않는다(§5.1/§2.4.1).
  const buyerTel = payment.buyerTel || memoryPhone || undefined;
  // m_redirect_url: same-origin 복귀 경로로 고정(외부 입력 금지, §4.5).
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
          name: ORDER_NAME,
          amount: Number(amount), // 정수 검증 후 변환
          ...(buyerTel ? { buyer_tel: buyerTel } : {}),
          ...(mRedirectUrl ? { m_redirect_url: mRedirectUrl } : {}),
        },
        (res: PortOneV1PayResponse) => {
          if (res?.success === true) {
            // success는 서버 확인 시작 신호. imp_uid 필수 + merchant_uid 일치 확인(위변조/혼선 방어, §4.5).
            if (!res.imp_uid) {
              finish({ kind: "error", message: MSG_FAILED });
              return;
            }
            // merchant_uid는 정확히 이 주문(paymentId)과 일치해야 한다(§5.1). 누락·공백·불일치는 모두 거부한다
            // (성공 신호 위조·주문 혼선 방어). 승인 판정은 계속 서버 REST 재조회가 유일 근거다.
            if (res.merchant_uid !== paymentId) {
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
 * 결제 실행 진입점. `provider === "portone_v1"`을 먼저 처리하고, 그 외(mock)는 기존 launchProvider 경로를
 * 보존한다(guestProvider.ts 불변).
 * @param redirectPath 모바일 리다이렉트 복귀 경로(신청=GUEST_APPLY_PATH, 연장=GUEST_STATUS_PATH).
 * @param memoryPhone  OTP 흐름의 메모리 전화(buyer_tel 폴백). 저장소·URL에 보관하지 않는다(§5.1).
 * @param shouldCancel 로더 await 이후 결제창을 열기 직전 호출하는 취소 판정(화면 이탈·reset·세션 변경 시 true).
 *                     true면 결제창을 열지 않고 `aborted`로 반환한다(§4.7 실행 취소).
 */
export async function runPayment(
  payment: Record<string, string>,
  redirectPath: string = GUEST_APPLY_PATH,
  memoryPhone?: string,
  shouldCancel?: () => boolean
): Promise<PaymentOutcome> {
  if (!payment || typeof payment !== "object") return { kind: "recover" };
  if (payment.provider === "portone_v1")
    return runPortOneV1(payment, redirectPath, memoryPhone, shouldCancel);
  // mock(또는 레거시 리다이렉트): 기존 실행 경로 보존. url/action 있으면 이탈, 없으면 주문 상태 조회로 복구.
  const launched = launchProvider(payment);
  return launched ? { kind: "redirected" } : { kind: "recover" };
}

/**
 * 모바일 리다이렉트 복귀 쿼리에서 V1 식별자(imp_uid/merchant_uid)를 읽고, 읽은 뒤 URL에서 제거한다(§4.6).
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

/**
 * 기존 주문을 "SDK 재실행 없이" 전진시키는 복구 헬퍼(설계 §4.6, 모바일 복귀·콜백 유실).
 *
 * 콜백 전송 유실(모바일 복귀·네트워크·503)로 PG는 승인됐으나 서버 주문이 `pending`에 남은 경우,
 * 동일 멱등키로 서명 문맥을 재발급받아(= 새 주문 생성 아님) 같은 paymentId의 콜백을 재전송한 뒤 상태를
 * 재조회로 확정한다. 결제창(SDK)은 다시 띄우지 않으므로 중복 청구 위험이 없다.
 *
 * V1 콜백은 PG 발급 `imp_uid`가 필수다(서명 문맥만으로는 재조회 불가, §4.6):
 *   - 메모리 콜백 문맥(ctx.callback, imp_uid 포함)이 있으면 그대로 재전송.
 *   - 없으면 동일 멱등키로 문맥만 재발급하고, 리다이렉트 복귀 쿼리의 imp_uid(ctx.impUid)가 있으면 결합해
 *     재전송. imp_uid까지 유실된 pending의 실제 복구는 서버 복구 경로(merchant_uid 조회·cron)가 담당한다.
 * 콜백의 영구 거부(400 payment_failed/403/404/409)는 pending 재조회로 덮지 않고 보존한다(§4.8).
 */
export interface ResumeContext {
  purpose: "initial" | "renewal";
  draftId?: string;
  guestMonitoringId?: string;
  idempotencyKey: string;
  orderId: string;
  /** 메모리에 남아 있는 콜백 문맥(imp_uid 포함, 없으면 재발급). PII/서명을 저장소에 두지 않는다. */
  callback?: GuestPaymentCallbackRequest | null;
  /** [V1] 리다이렉트 복귀 쿼리의 imp_uid(미신뢰 입력). 메모리 문맥 소실 시 재발급 문맥과 결합해 재전송. */
  impUid?: string | null;
}

export type ResumeResult =
  | { kind: "state"; data: GuestOrderStateResponse } // 서버 상태 확보 → 호출부가 분류
  | { kind: "reauth" } // 401 — 호출부가 재인증 처리
  | { kind: "api_error"; status: number; code: string }; // 조회/재발급/영구 거부 → 호출부가 분류

export async function resendOrderCallback(ctx: ResumeContext): Promise<ResumeResult> {
  // 1) 현재 상태 확인. pending이 아니면 콜백 재전송이 불필요(서버 상태가 유일 근거).
  const first = await getOrderState(ctx.orderId);
  if (!first.ok) {
    return first.status === 401
      ? { kind: "reauth" }
      : { kind: "api_error", status: first.status, code: first.code };
  }
  if (first.data.status !== "pending") return { kind: "state", data: first.data };

  // 2) pending → 메모리 콜백 문맥(imp_uid 포함) 우선. 없으면 동일 멱등키로 문맥만 재발급(SDK 재실행 아님).
  let callback = ctx.callback ?? null;
  if (!callback) {
    const created = await createOrder(
      ctx.purpose === "initial"
        ? { purpose: "initial", draftId: ctx.draftId, idempotencyKey: ctx.idempotencyKey }
        : {
            purpose: "renewal",
            guestMonitoringId: ctx.guestMonitoringId,
            idempotencyKey: ctx.idempotencyKey,
          }
    );
    if (!created.ok) {
      return created.status === 401
        ? { kind: "reauth" }
        : { kind: "api_error", status: created.status, code: created.code };
    }
    // 재발급 문맥 + 리다이렉트 복귀 쿼리의 imp_uid가 있을 때만 V1 콜백을 구성한다(§4.6).
    const p = created.data.payment || {};
    if (ctx.impUid && p.provider === "portone_v1" && p.paymentId && p.callbackContext && p.callbackSignature) {
      callback = {
        paymentId: p.paymentId,
        imp_uid: ctx.impUid,
        callbackContext: p.callbackContext,
        callbackSignature: p.callbackSignature,
      };
    }
    // imp_uid가 없으면 콜백을 보내지 않고 아래 재조회로만 확정(서버 복구 경로가 최종 처리).
  }
  if (callback) {
    const cb = await paymentCallback(callback);
    if (!cb.ok) {
      const action = classifyApiFailure(cb.status, cb.code);
      if (action.kind === "reauth") return { kind: "reauth" };
      // 영구 거부(payment_failed 400 / 403 / 404 / 409)는 pending 재조회로 숨기지 않고 보존(§4.8).
      if (action.kind === "blocked" || action.kind === "reparse" || action.kind === "conflict") {
        return { kind: "api_error", status: cb.status, code: cb.code };
      }
      // 일시 실패(payment_pending/429/503/network) → 아래 재조회로 수렴(동일 문맥 재시도 가능).
    }
  }

  // 3) 재조회로 확정.
  const st = await getOrderState(ctx.orderId);
  if (!st.ok) {
    return st.status === 401
      ? { kind: "reauth" }
      : { kind: "api_error", status: st.status, code: st.code };
  }
  return { kind: "state", data: st.data };
}
