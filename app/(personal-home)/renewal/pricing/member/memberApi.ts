/**
 * 회원 선불 구독 — 프론트엔드 API 클라이언트.
 *
 * 설계서(docs/02-design/features/guest.design.md §3)의 회원 전용 API 계약을 1:1로 감싼다.
 * 경로·메서드·요청/응답 DTO는 전부 스펙 고정이며, 백엔드(Codex)가 동일 계약으로 구현한다.
 *
 * - 권한 근거는 NextAuth HttpOnly 세션 쿠키뿐 → 모든 요청 `credentials: "same-origin"`.
 * - 응답은 서버가 `Cache-Control: no-store`로 내려주며, 클라이언트도 캐시를 쓰지 않는다.
 * - 가격·할인·한도·역할·기간은 서버가 SSOT로 결정. 클라이언트는 표시/전달만 하고 신뢰 판단을 하지 않는다.
 * - 비회원 경로(`/api/guest-monitoring`)와 **분리된** 회원 전용 경로(`/api/member-subscription`)만 호출한다.
 */

import type {
  MemberOrderRequest,
  MemberOrderResponse,
  MemberOrderStatus,
  MemberPaymentCallbackRequest,
  MemberSubscriptionStatus,
  MemberPlan,
} from "@/types/member-subscription";

const BASE = "/api/member-subscription";

/** 성공/실패를 구분한 결과 타입 — 호출부는 반드시 ok 분기 후 data 접근 */
export type MemberApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; code: string };

/** 공통 실패 메시지(서버가 상세 사유를 숨길 때의 사용자용 기본 안내) */
const FALLBACK_ERROR = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

/** 네트워크/파싱 공통 처리. 성공 바디는 T, 실패는 {error, code} 계약을 따른다. */
async function toResult<T>(res: Response): Promise<MemberApiResult<T>> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (res.ok) {
    return { ok: true, data: (body ?? {}) as T };
  }
  const b = (body ?? {}) as { error?: string; code?: string };
  return {
    ok: false,
    status: res.status,
    error: b.error || FALLBACK_ERROR,
    code: b.code || `http_${res.status}`,
  };
}

/** 예외(네트워크 끊김 등)를 공통 실패 결과로 변환 */
function networkFail(): MemberApiResult<never> {
  return { ok: false, status: 0, error: "네트워크 오류가 발생했습니다.", code: "network_error" };
}

async function postJson<T>(path: string, body: unknown): Promise<MemberApiResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
    return toResult<T>(res);
  } catch {
    return networkFail();
  }
}

async function getJson<T>(path: string): Promise<MemberApiResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    return toResult<T>(res);
  } catch {
    return networkFail();
  }
}

/** §3.1 POST /orders — 주문 생성(로그인·멱등키). 금액/할인/한도/역할/기간가격 입력 불허(plan·durationMonths·productKind만). */
export function createOrder(req: MemberOrderRequest): Promise<MemberApiResult<MemberOrderResponse>> {
  return postJson<MemberOrderResponse>("/orders", req);
}

/** §3.2 GET /orders/[orderId] — 본인 주문·적용 여부 조회(완료 판정의 유일 근거: status==="paid" && applied===true). */
export function getOrderState(orderId: string): Promise<MemberApiResult<MemberOrderStatus>> {
  return getJson<MemberOrderStatus>(`/orders/${encodeURIComponent(orderId)}`);
}

/** §3.4 POST /orders/[orderId]/recover — 본인 주문 재조회·복구(새 결제 아님). imp_uid 있으면 재검증, 없으면 merchant_uid 후보 탐색. */
export function recoverOrder(
  orderId: string,
  impUid?: string | null
): Promise<MemberApiResult<{ status: MemberOrderStatus["status"]; applied: boolean }>> {
  return postJson<{ status: MemberOrderStatus["status"]; applied: boolean }>(
    `/orders/${encodeURIComponent(orderId)}/recover`,
    impUid ? { imp_uid: impUid } : {}
  );
}

/** §3.3 POST /payment/callback — 결제 콜백(브라우저 경로). 서버 발급 문맥을 echo로 POST. 성공 `{ok:true}`. */
export function paymentCallback(
  req: MemberPaymentCallbackRequest
): Promise<MemberApiResult<{ ok: true }>> {
  return postJson<{ ok: true }>("/payment/callback", req);
}

/** §3.5 POST /trial — 7일 무료체험 시작(결제 승인 없는 trialing, 계정당 1회). */
export function startTrial(
  plan: MemberPlan
): Promise<MemberApiResult<{ status: "trialing"; plan: MemberPlan; trialEndsAt: string; monitoringLimit: number }>> {
  return postJson("/trial", { plan });
}

/** §3.6 GET /status — 구독/체험/grace/잠금/영수증 요약(화면 표시의 유일 근거, 잠금 중에도 접근 가능). */
export function getStatus(): Promise<MemberApiResult<MemberSubscriptionStatus>> {
  return getJson<MemberSubscriptionStatus>("/status");
}
