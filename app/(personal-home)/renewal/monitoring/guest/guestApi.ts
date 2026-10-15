/**
 * 비회원 등기감시 — 프론트엔드 API 클라이언트.
 *
 * 설계서(docs/02-design/features/lib.design.md §3)의 API 계약을 1:1로 감싼다.
 * 경로·메서드·요청/응답 DTO는 전부 스펙 고정이며, 백엔드(Codex)가 동일 계약으로 구현한다.
 *
 * - 권한 근거는 조회 세션 쿠키(HttpOnly)뿐 → 모든 요청 `credentials: "same-origin"`.
 * - 응답은 서버가 `Cache-Control: no-store`로 내려주며, 클라이언트도 캐시를 쓰지 않는다.
 * - 가격·기간·권한은 서버가 SSOT로 결정. 클라이언트는 표시/전달만 하고 신뢰 판단을 하지 않는다.
 */

import type {
  GuestDraftResponse,
  GuestIdentityStartRequest,
  GuestIdentityStartResponse,
  GuestOtpVerifyRequest,
  GuestOtpVerifyResponse,
  GuestOrderRequest,
  GuestOrderResponse,
  GuestOrderStateResponse,
  GuestPropertyDto,
  GuestCalendarResponse,
} from "@/types/guest-monitoring";

const BASE = "/api/guest-monitoring";

/** 성공/실패를 구분한 결과 타입 — 호출부는 반드시 ok 분기 후 data 접근 */
export type GuestApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; code: string };

/** 공통 실패 메시지(서버가 상세 사유를 숨길 때의 사용자용 기본 안내) */
const FALLBACK_ERROR = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

/** 네트워크/파싱 공통 처리. 성공 바디는 T, 실패는 {error, code} 계약을 따른다. */
async function toResult<T>(res: Response): Promise<GuestApiResult<T>> {
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
function networkFail(): GuestApiResult<never> {
  return { ok: false, status: 0, error: "네트워크 오류가 발생했습니다.", code: "network_error" };
}

async function postJson<T>(path: string, body: unknown): Promise<GuestApiResult<T>> {
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

async function getJson<T>(path: string): Promise<GuestApiResult<T>> {
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

/**
 * §3.1 POST /parse-pdf — PDF 파싱 + 초안 생성.
 * 멀티파트. 클라이언트는 commUniqueNo/ownerName을 보내지 않는다(서버 추출만 신뢰).
 */
export async function parsePdf(input: {
  file: File;
  guestName: string;
  guestPhone: string;
  address: string;
}): Promise<GuestApiResult<GuestDraftResponse>> {
  try {
    const fd = new FormData();
    fd.append("file", input.file);
    fd.append("guestName", input.guestName);
    fd.append("guestPhone", input.guestPhone);
    fd.append("address", input.address);
    const res = await fetch(`${BASE}/parse-pdf`, {
      method: "POST",
      body: fd,
      credentials: "same-origin",
      cache: "no-store",
    });
    return toResult<GuestDraftResponse>(res);
  } catch {
    return networkFail();
  }
}

/** §3.2 POST /identity/start — 본인인증 시작 */
export function identityStart(
  req: GuestIdentityStartRequest
): Promise<GuestApiResult<GuestIdentityStartResponse>> {
  return postJson<GuestIdentityStartResponse>("/identity/start", req);
}

/**
 * §3.3 POST /identity/verify-otp — SMS OTP 인증번호 확인.
 * 성공(200) 시 서버가 HttpOnly 조회 세션 쿠키를 설정한다(응답 바디엔 토큰 없음).
 * 실패는 비-2xx(`{error, code}`)로 반환 — 성공 오인 방지(ok 분기 후 접근).
 */
export function verifyOtp(
  req: GuestOtpVerifyRequest
): Promise<GuestApiResult<GuestOtpVerifyResponse>> {
  return postJson<GuestOtpVerifyResponse>("/identity/verify-otp", req);
}

/** §3.3 POST /orders — 신규/연장 주문 생성(멱등키) */
export function createOrder(req: GuestOrderRequest): Promise<GuestApiResult<GuestOrderResponse>> {
  return postJson<GuestOrderResponse>("/orders", req);
}

/** §3.3 GET /orders/[orderId] — 주문 상태 조회(결제 중 복구용, 최소 상태만) */
export function getOrderState(orderId: string): Promise<GuestApiResult<GuestOrderStateResponse>> {
  return getJson<GuestOrderStateResponse>(`/orders/${encodeURIComponent(orderId)}`);
}

/** §3.4 GET /properties — 본인 신청 물건 목록(조회 세션 필요) */
export function listProperties(): Promise<GuestApiResult<{ properties: GuestPropertyDto[] }>> {
  return getJson<{ properties: GuestPropertyDto[] }>("/properties");
}

/** §3.4 GET /properties/[id]/calendar?month=YYYY-MM — 월간 달력 DTO(조회 세션 필요) */
export function getCalendar(
  id: string,
  month?: string
): Promise<GuestApiResult<GuestCalendarResponse>> {
  const q = month ? `?month=${encodeURIComponent(month)}` : "";
  return getJson<GuestCalendarResponse>(`/properties/${encodeURIComponent(id)}/calendar${q}`);
}

/** §3.4 DELETE /session — 조회 세션 폐기(로그아웃) */
export async function deleteSession(): Promise<GuestApiResult<{ ok: true }>> {
  try {
    const res = await fetch(`${BASE}/session`, {
      method: "DELETE",
      credentials: "same-origin",
      cache: "no-store",
    });
    return toResult<{ ok: true }>(res);
  } catch {
    return networkFail();
  }
}
