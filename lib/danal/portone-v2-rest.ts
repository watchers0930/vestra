// PortOne V2 REST 클라이언트 (api.portone.io). V1(iamport-rest.ts)과 병행 — 점진 전환용.
// V1과 차이: 토큰 발급·캐싱 없음(API Secret 직접 헤더), paymentId 단건 조회(imp_uid↔merchant_uid 이중성/findAll 제거).
import { GuestError, unavailable } from "@/lib/guest-monitoring/errors";
import { getPortoneV2Config } from "./portone-v2-config";
import { v2PaymentSchema, type V2Payment } from "./portone-v2-schemas";

const BASE = "https://api.portone.io";

async function v2Fetch(path: string, method: "GET" | "POST", body?: object): Promise<{ status: number; json: unknown }> {
  const { apiSecret } = getPortoneV2Config(); // 모든 외부 요청 게이트
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
      headers: {
        Authorization: `PortOne ${apiSecret}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let json: unknown = null;
    try { json = await res.json(); } catch { /* body 없음/비JSON */ }
    return { status: res.status, json };
  } finally {
    clearTimeout(timeout);
  }
}

/** paymentId(=서버 orderId)로 V2 결제 단건 조회. 미결제/없음(404)→null, 그 외 오류→provider_unavailable.
 *  provider 원문/예외 텍스트를 상위로 전파하지 않는다(민감정보 비노출). */
export async function getPaymentByIdV2(paymentId: string): Promise<V2Payment | null> {
  const { storeId } = getPortoneV2Config();
  let res: { status: number; json: unknown };
  try {
    res = await v2Fetch(`/payments/${encodeURIComponent(paymentId)}?storeId=${encodeURIComponent(storeId)}`, "GET");
  } catch {
    return unavailable();
  }
  if (res.status === 404) return null;
  if (res.status !== 200) return unavailable();
  const parsed = v2PaymentSchema.safeParse(res.json);
  if (!parsed.success) return unavailable();
  return parsed.data;
}

/** 전액 취소(테스트/오류 정정용). */
export async function cancelPaymentV2(paymentId: string, reason: string): Promise<void> {
  let res: { status: number; json: unknown };
  try {
    res = await v2Fetch(`/payments/${encodeURIComponent(paymentId)}/cancel`, "POST", { reason });
  } catch {
    return unavailable();
  }
  if (res.status === 404) throw new GuestError("payment_failed", 400);
  if (res.status !== 200) return unavailable();
}
