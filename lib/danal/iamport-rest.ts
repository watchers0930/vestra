import { createHash } from "node:crypto";
import { GuestError, unavailable } from "@/lib/guest-monitoring/errors";
import { getPortoneV1Config } from "./portone-v1-config";
import { paymentFailed } from "./portone-callback";
import { candidateSchema, envelopeSchema, iamportPaymentSchema, tokenSchema } from "./iamport-schemas";
export type { IamportPayment } from "./iamport-schemas";
export class PortonePaymentNotFound extends GuestError {
  constructor() { super("provider_unavailable", 503); }
}
class Unauthorized extends Error {}
type Token = { value: string; expiresAt: number };
// Credentials are fingerprinted so rotations cannot reuse another account's token.
let tokenState: { key: string; cached?: Token; flight?: Promise<Token> } | undefined;
async function request(path: string, token?: string, body?: object): Promise<unknown> {
  getPortoneV1Config(); // Gate every external request, including token refresh.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.iamport.kr${path}`, {
      method: body ? "POST" : "GET", cache: "no-store", redirect: "error", signal: controller.signal,
      headers: { ...(token ? { Authorization: token } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 401) throw new Unauthorized();
    if (response.status === 404) throw new PortonePaymentNotFound();
    if (!response.ok) return unavailable();
    const parsed = envelopeSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.code !== 0) return unavailable();
    return parsed.data.response;
  } catch (error) {
    if (error instanceof Unauthorized || error instanceof PortonePaymentNotFound) throw error;
    return unavailable();
  } finally { clearTimeout(timeout); }
}
function state() {
  const { restKey, restSecret } = getPortoneV1Config();
  const key = createHash("sha256").update(JSON.stringify([restKey, restSecret])).digest("hex");
  if (tokenState?.key !== key) tokenState = { key };
  return { entry: tokenState, restKey, restSecret };
}
async function accessToken() {
  const { entry, restKey, restSecret } = state();
  if (entry.cached && entry.cached.expiresAt > Date.now()) return entry.cached;
  if (!entry.flight) {
    entry.flight = (async () => {
      const parsed = tokenSchema.safeParse(await request("/users/getToken", undefined, { imp_key: restKey, imp_secret: restSecret }));
      if (!parsed.success || parsed.data.expired_at <= parsed.data.now) return unavailable();
      const value = { value: parsed.data.access_token,
        expiresAt: Math.min(parsed.data.expired_at * 1000, Date.now() + (parsed.data.expired_at - parsed.data.now) * 1000) - 5000 };
      if (value.expiresAt <= Date.now()) return unavailable();
      entry.cached = value;
      return value;
    })();
  }
  const flight = entry.flight;
  try { return await flight; }
  finally { if (entry.flight === flight) entry.flight = undefined; }
}
async function authorized(path: string, body?: object) {
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await accessToken();
      try { return await request(path, token.value, body); }
      catch (error) {
        if (!(error instanceof Unauthorized)) throw error;
        const { entry } = state();
        // Do not evict a newer token when simultaneous stale requests get 401.
        if (entry.cached === token) entry.cached = undefined;
        if (attempt === 1) return unavailable();
      }
    }
  } catch (error) {
    if (error instanceof PortonePaymentNotFound) throw error;
    return unavailable();
  }
  return unavailable();
}
export async function getPaymentByImpUid(impUid: string) {
  const parsed = iamportPaymentSchema.safeParse(await authorized(`/payments/${encodeURIComponent(impUid)}`));
  if (!parsed.success) return unavailable();
  return parsed.data;
}
/** merchant_uid(=서버 orderId)로 결제를 조회한다. 아임포트 테스트 환경에서 imp_uid 직접조회
 * (/payments/{imp_uid})가 "존재하지 않는 결제"로 실패하는 경우가 있어, 서버가 제어하는
 * merchant_uid 기준 조회를 정본으로 쓴다(더 안전). 반환 결제의 imp_uid는 호출부(mapPayment)에서 대조. */
export async function getPaymentByMerchantUid(merchantUid: string) {
  const parsed = iamportPaymentSchema.safeParse(await authorized(`/payments/find/${encodeURIComponent(merchantUid)}`));
  if (!parsed.success) return unavailable();
  return parsed.data;
}
/** Do not filter to paid: a second attempt makes a merchant UID ambiguous. */
export async function findImpUidByMerchantUid(merchantUid: string): Promise<string | null> {
  const parsed = candidateSchema.safeParse(await authorized(`/payments/findAll/${encodeURIComponent(merchantUid)}?page=1&limit=2`));
  if (!parsed.success) return unavailable();
  const { total, next, list } = parsed.data;
  if (total === 0 && list.length === 0 && next === 0) return null;
  if (total !== 1 || next !== 0 || list.length !== 1) throw new GuestError("payment_needs_review", 409);
  if (list[0].merchant_uid !== merchantUid) return paymentFailed();
  return list[0].imp_uid;
}
export async function cancelPaymentByImpUid(impUid: string) {
  const parsed = iamportPaymentSchema.safeParse(await authorized("/payments/cancel", { imp_uid: impUid }));
  if (!parsed.success) return unavailable();
}
