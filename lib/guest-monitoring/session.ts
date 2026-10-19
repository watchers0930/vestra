import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDanalProvider } from "@/lib/danal";
import { guestIdentityHash } from "./identity-hash";
import { GuestError, notFound } from "./errors";
import { SESSION_TTL, GUEST_IDLE_TTL, GUEST_ABSOLUTE_TTL } from "./config";
import { guestLimit } from "./rate-limit-keys";
import { BROWSER_COOKIE, digest, token, binding } from "./session-binding";
import { resolveIdentityMode } from "./identity-mode";
import { startOtp } from "./sms-otp";
import { limitIdentityCost } from "./identity-cost";
import { bindDraftRole } from "./draft-role";
import type { GuestIdentityStartRequest, VerificationPurpose } from "@/types/guest-monitoring";
export const SESSION_COOKIE = "guest_monitoring_session";
export { BROWSER_COOKIE, digest } from "./session-binding";
// Both cookies support cross-site provider POST returns. Mutations still require Origin.
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" as const : "lax" as const, path: "/api/guest-monitoring" });
export async function startIdentity(req: NextRequest, input: GuestIdentityStartRequest) {
  if (resolveIdentityMode() === "sms_otp") return startOtp(req, input);
  const provider = getDanalProvider();
  const identity = guestIdentityHash(input.guestName, input.guestPhone);
  await bindDraftRole(identity, input);
  const browser = req.cookies.get(BROWSER_COOKIE)?.value || token();
  const nonce = token();
  const expiresAt = new Date(Date.now() + SESSION_TTL);
  await limitIdentityCost();
  const launch = await provider.identity.startVerification({ nonce, expiresAt });
  const session = await prisma.guestVerificationSession.create({ data: {
    tokenHash: digest(token()), requestNonce: nonce, purpose: input.purpose,
    draftId: input.draftId, inputIdentityHash: identity,
    browserBindingHash: binding(req, browser), expiresAt,
  }, select: { id: true } });
  return { data: { verificationId: session.id, launch, expiresAt: expiresAt.toISOString() }, browser };
}
export function attachBrowser(response: NextResponse, browser: string) {
  // maxAge 없음 = 세션 쿠키. 브라우저/탭 종료 시 삭제돼 재접속 시 재인증을 요구한다(로그아웃 정책).
  // 결제 리다이렉트 복귀는 창을 닫지 않으므로 유지된다.
  response.cookies.set(BROWSER_COOKIE, browser, { ...cookieOptions(),
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax" });
}
export async function consumeIdentity(req: NextRequest, input: unknown) {
  const result = await getDanalProvider().identity.verifyResult(input);
  await guestLimit("callback:identity", result.nonce, 20);
  const browser = req.cookies.get(BROWSER_COOKIE)?.value;
  if (!browser || !result.approved) throw new GuestError("verification_failed");
  const identity = guestIdentityHash(result.guestName, result.guestPhone);
  const rawToken = token();
  const now = new Date();
  const session = await prisma.guestVerificationSession.findUnique({ where: { requestNonce: result.nonce }, select: { id: true, purpose: true } });
  if (!session) throw new GuestError("verification_failed");
  const consumed = await prisma.guestVerificationSession.updateMany({ where: {
    id: session.id, inputIdentityHash: identity, browserBindingHash: binding(req, browser),
    consumedAt: null, revokedAt: null, expiresAt: { gt: now },
  }, data: {
    tokenHash: digest(rawToken), verifiedIdentityHash: identity, providerTxId: result.transactionId,
    verifiedAt: now, consumedAt: now, expiresAt: new Date(now.getTime() + GUEST_IDLE_TTL),
  } });
  if (consumed.count !== 1) throw new GuestError("verification_failed");
  return { rawToken, purpose: session.purpose };
}
export function attachSession(response: NextResponse, rawToken: string) {
  // maxAge 없음 = 세션 쿠키(브라우저 종료 시 삭제). 서버는 유휴 10분/절대 60분으로 수명을 강제한다.
  response.cookies.set(SESSION_COOKIE, rawToken, { ...cookieOptions() });
  // Browser binding remains valid for the full verified session lifetime.
}
export async function requireSession(req: NextRequest, purposes: VerificationPurpose[] = ["apply", "status", "renewal"]) {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  const browser = req.cookies.get(BROWSER_COOKIE)?.value;
  if (!raw || raw.length > 128 || !browser) throw new GuestError("session_required", 401);
  const session = await prisma.guestVerificationSession.findUnique({ where: { tokenHash: digest(raw) } });
  if (!session || !session.verifiedAt || !session.consumedAt || session.revokedAt ||
      session.expiresAt <= new Date() || !session.verifiedIdentityHash ||
      session.verifiedIdentityHash !== session.inputIdentityHash ||
      session.browserBindingHash !== binding(req, browser)) throw new GuestError("session_required", 401);
  if (!purposes.includes(session.purpose as VerificationPurpose)) notFound();
  // 유휴 슬라이딩: 활동이 있을 때마다 만료를 now+유휴(10분)로 밀되, verifiedAt+절대상한(60분)을 넘지 않게
  // clamp. 앞으로 당겨질 때만(next>현재) 기록해 불필요한 쓰기를 줄인다. 상한 도달 후엔 expiresAt가 상한에
  // 고정돼 그 시점 이후 요청은 위 expiresAt<=now 검사로 자동 401(절대 만료 강제). 스키마 변경 불필요.
  const cap = session.verifiedAt.getTime() + GUEST_ABSOLUTE_TTL;
  const next = Math.min(Date.now() + GUEST_IDLE_TTL, cap);
  if (next > session.expiresAt.getTime()) {
    await prisma.guestVerificationSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { expiresAt: new Date(next) },
    });
  }
  return session as typeof session & { verifiedIdentityHash: string };
}
export async function revokeSession(req: NextRequest, response: NextResponse) {
  const session = await requireSession(req);
  await prisma.guestVerificationSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(BROWSER_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}
