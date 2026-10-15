/**
 * 비회원 등기감시 — 결제 실행 헬퍼(설계 §5.1, 신규).
 *
 * 책임: 서버 orders 응답의 `payment`(실행 정보 + 서명 문맥)를 받아 공급자별로 결제를 실행하고,
 * 그 결과를 판별 유니온(PaymentOutcome)으로 반환한다. UI/상태 전이는 useGuestApply가 담당하며,
 * 이 파일은 "결제 프로토콜"만 책임진다(페이지·컴포넌트에 결제 프로토콜을 넣지 않기 위함, 절대규칙 §2).
 *
 * 신뢰 경계(§1.1):
 *   - SDK 반환(브라우저 금액·승인 상태)은 신뢰하지 않는다. 성공 신호는 "콜백 POST 필요"로만 환산한다.
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

/**
 * 결제 실행 결과(§5.1). UI 세부는 호출부가 결정한다.
 *  - redirected  : 페이지 이탈(다날/모바일 리다이렉트) → 복귀 시 useEffect가 재개
 *  - confirm     : SDK 인라인 성공 → 서명 문맥으로 콜백 POST 필요
 *  - recover     : 실행 정보 없음(mock 즉시완료 등) → 주문 상태 조회로 복구
 *  - canceled    : 사용자 닫기/취소 → 재조회(승인 불명확 → 새 결제 금지)
 *  - unavailable : 결제창을 띄우기 전 중단(모듈 로드 실패·실행정보 미비·금액 불일치). 결제 시도가
 *                  일어나지 않았으므로 "승인 대기"로 덮지 않고 오류를 유지한다. 같은 주문에 SDK를
 *                  다시 실행해도 안전(출금 없음) → 호출부는 retry_payment로 재실행 유도(§4.3/버그①).
 *  - error       : SDK code/예외 — 실행이 시작됐을 수 있어 불명확 → 서버 상태가 판정(재조회 먼저)
 */
export type PaymentOutcome =
  | { kind: "redirected" }
  | { kind: "confirm"; callback: GuestPaymentCallbackRequest }
  | { kind: "recover" }
  | { kind: "canceled" }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

/** 가격 SSOT는 서버(lib/pricing-plans). 클라이언트는 SDK 경계 정합성 확인용으로만 기대값을 둔다(§5.1). */
const EXPECTED_AMOUNT = 10000;
const ORDER_NAME = "등기감시 1개월";

/** PortOne V2 응답 최소 형태 — 설치 전/타입 미확정이라 any 경계에서 좁혀 쓴다(§11). */
interface PortOneResponse {
  code?: string | null; // null/undefined면 성공, 값이 있으면 실패(취소 포함)
  message?: string | null;
  paymentId?: string;
  txId?: string;
  transactionType?: string;
}
interface PortOneSdk {
  requestPayment: (req: Record<string, unknown>) => Promise<PortOneResponse | undefined>;
}

/**
 * PortOne V2 브라우저 SDK 동적 로드.
 * 설치는 백엔드(설계 B11)가 담당한다. 미설치/로드 실패 시 null → 호출부는 error로 degrade한다.
 */
async function loadSdk(): Promise<PortOneSdk | null> {
  try {
    // "@portone/browser-sdk" 설치는 백엔드 B11 담당. 설치 전엔 타입 미해결이라 ts-ignore로 억제한다.
    // ts-expect-error를 쓰지 않는 이유: 설치 후엔 오류가 사라져 "미사용 지시자" 오류로 역전되기 때문
    // (설치 전후 모두 안전해야 함). 런타임 번들은 설치 후 포함된다.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- 설치 전 모듈 미해결 허용
    const mod = await import("@portone/browser-sdk/v2");
    const sdk = ((mod as { default?: unknown }).default ?? mod) as PortOneSdk;
    return typeof sdk?.requestPayment === "function" ? sdk : null;
  } catch {
    return null;
  }
}

/** 사용자 닫기/취소로 보이는 코드·메시지인지(취소 vs 에러 구분 — 둘 다 서버 재조회로 수렴). */
function looksCanceled(res: PortOneResponse): boolean {
  const s = `${res.code ?? ""} ${res.message ?? ""}`.toUpperCase();
  return /CANCEL|CLOSE|취소|닫/.test(s);
}

/** PortOne 결제 실행. payment Record는 전부 문자열(§2.4.1). */
async function runPortOne(
  payment: Record<string, string>,
  redirectPath: string
): Promise<PaymentOutcome> {
  const { storeId, channelKey, paymentId, payMethod, totalAmount, currency } = payment;
  const callbackContext = payment.callbackContext;
  const callbackSignature = payment.callbackSignature;

  // 실행 정보가 하나라도 비면 결제창을 띄우지 않는다(§4.3). 아직 실행 전이므로 unavailable
  // (승인 대기로 덮지 않고 오류 유지 + 같은 주문 재실행 허용).
  if (!storeId || !channelKey || !paymentId || !payMethod || !callbackContext || !callbackSignature) {
    return { kind: "unavailable", message: "결제 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  // 금액: Number() 변환 전 정수 검증(§5.1). 서버 SSOT(10000)와 경계 정합성까지 확인.
  if (!/^\d+$/.test(totalAmount) || Number(totalAmount) !== EXPECTED_AMOUNT) {
    return { kind: "unavailable", message: "결제 금액 정보가 올바르지 않습니다. 다시 시도해 주세요." };
  }

  const sdk = await loadSdk();
  if (!sdk) {
    // 모듈 미설치/로드 실패(설계 B11 선행 누락 등). 결제창 미실행 → unavailable로 유지(버그①).
    return { kind: "unavailable", message: "결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  let res: PortOneResponse | undefined;
  try {
    res = await sdk.requestPayment({
      storeId,
      channelKey,
      paymentId,
      orderName: ORDER_NAME,
      totalAmount: Number(totalAmount), // 정수 검증 후 변환
      // SDK enum 표기가 다르면 의미상 KRW로 경계 변환(§4.3). 서버 응답 통화도 KRW로 고정.
      currency: currency === "KRW" || !currency ? "KRW" : currency,
      payMethod,
      // 모바일 리다이렉트 복귀용 URL(§4.2/§4.3). 흐름별 복귀 경로(신청/연장)를 호출부가 지정한다.
      // 서명·nonce·개인정보는 담지 않는다.
      redirectUrl:
        typeof window !== "undefined" ? `${window.location.origin}${redirectPath}` : undefined,
    });
  } catch {
    return { kind: "error", message: "결제 중 오류가 발생했습니다. 주문 상태를 확인해 주세요." };
  }

  // 모바일 리다이렉트 채널: 페이지 이탈로 응답 없이 돌아오는 경우 → 복귀 시 재조회로 재개.
  if (!res) return { kind: "redirected" };

  if (res.code != null) {
    return looksCanceled(res)
      ? { kind: "canceled" }
      : { kind: "error", message: "결제가 완료되지 않았습니다. 주문 상태를 확인해 주세요." };
  }

  // 성공: 반환 paymentId가 요청 ID와 일치해야 한다(혼선/위변조 방어, §4.3).
  if (res.paymentId && res.paymentId !== paymentId) {
    return { kind: "error", message: "결제 식별자가 일치하지 않습니다. 주문 상태를 확인해 주세요." };
  }

  // 성공 신호는 "콜백 POST 필요"로만 환산. 승인 확정은 서버 REST 재조회가 한다.
  return { kind: "confirm", callback: { paymentId, callbackContext, callbackSignature } };
}

/**
 * 결제 실행 진입점. `provider === "portone"`을 먼저 처리하고, 그 외(다날/mock)는 기존
 * launchProvider 경로를 보존한다(guestProvider.ts 불변).
 * @param redirectPath 모바일 리다이렉트 복귀 경로(신청=GUEST_APPLY_PATH, 연장=GUEST_STATUS_PATH).
 */
export async function runPayment(
  payment: Record<string, string>,
  redirectPath: string = GUEST_APPLY_PATH
): Promise<PaymentOutcome> {
  if (!payment || typeof payment !== "object") return { kind: "recover" };
  if (payment.provider === "portone") return runPortOne(payment, redirectPath);
  // 다날/mock: 기존 실행 경로 보존. url/action 있으면 이탈, 없으면(mock) 주문 상태 조회로 복구.
  const launched = launchProvider(payment);
  return launched ? { kind: "redirected" } : { kind: "recover" };
}

/**
 * 기존 주문을 "SDK 재실행 없이" 전진시키는 복구 헬퍼(설계 §4.2/§6.3, 버그②·③).
 *
 * 콜백 전송 유실(모바일 복귀·네트워크·503)로 PG는 승인됐으나 서버 주문이 `pending`에 남은 경우,
 * 동일 멱등키로 문맥을 재발급받아(= 새 주문 생성 아님) 같은 paymentId의 콜백을 재전송한 뒤 상태를
 * 재조회로 확정한다. 결제창(SDK)은 다시 띄우지 않으므로 중복 청구 위험이 없다.
 *
 * - 먼저 상태를 조회해 `pending`이 아니면(applied/failed/paid·needs_review) 그대로 반환한다.
 * - 메모리에 콜백 문맥이 있으면 그대로 재전송, 없으면(새로고침/모바일 복귀) createOrder로 재발급.
 *   payment가 `{}`(이미 기록된 주문)면 재조회만 한다.
 * - 콜백의 401만 재인증으로 올리고, 그 외 콜백 실패(payment_pending/503 등)는 재조회로 수렴한다.
 */
export interface ResumeContext {
  purpose: "initial" | "renewal";
  draftId?: string;
  guestMonitoringId?: string;
  idempotencyKey: string;
  orderId: string;
  /** 메모리에 남아 있는 콜백 문맥(없으면 동일 멱등키로 재발급). PII/서명을 저장소에 두지 않는다. */
  callback?: GuestPaymentCallbackRequest | null;
}

export type ResumeResult =
  | { kind: "state"; data: GuestOrderStateResponse } // 서버 상태 확보 → 호출부가 분류
  | { kind: "reauth" } // 401 — 호출부가 재인증 처리
  | { kind: "api_error"; status: number; code: string }; // 조회/재발급 실패 → 호출부가 분류

export async function resendOrderCallback(ctx: ResumeContext): Promise<ResumeResult> {
  // 1) 현재 상태 확인. pending이 아니면 콜백 재전송이 불필요(서버 상태가 유일 근거).
  const first = await getOrderState(ctx.orderId);
  if (!first.ok) {
    return first.status === 401
      ? { kind: "reauth" }
      : { kind: "api_error", status: first.status, code: first.code };
  }
  if (first.data.status !== "pending") return { kind: "state", data: first.data };

  // 2) pending → 콜백 재전송. 메모리 문맥 우선, 없으면 동일 멱등키로 문맥만 재발급(SDK 재실행 아님).
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
    const p = created.data.payment || {};
    if (p.provider === "portone" && p.paymentId && p.callbackContext && p.callbackSignature) {
      callback = {
        paymentId: p.paymentId,
        callbackContext: p.callbackContext,
        callbackSignature: p.callbackSignature,
      };
    }
    // payment가 {} 등 문맥이 없으면(이미 기록된 주문) 콜백을 보내지 않고 재조회로 확정한다.
  }
  if (callback) {
    const cb = await paymentCallback(callback);
    if (!cb.ok && cb.status === 401) return { kind: "reauth" };
    // 성공·일시 실패 모두 아래 재조회로 서버 상태가 판정(새 결제 금지).
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
