import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDanalProvider } from "@/lib/danal";
import { guestIdentityHash } from "./identity-hash";
import { GuestError, notFound } from "./errors";
import { SESSION_TTL } from "./config";
import { guestLimit } from "./rate-limit-keys";
import { BROWSER_COOKIE, digest, token, binding } from "./session-binding";
import { resolveIdentityMode } from "./identity-mode";
import { startOtp } from "./sms-otp";
import { limitIdentityCost } from "./identity-cost";
import type { VerificationPurpose } from "@/types/guest-monitoring";
export const SESSION_COOKIE = "guest_monitoring_session";
export { BROWSER_COOKIE, digest } from "./session-binding";
// Both cookies support cross-site provider POST returns. Mutations still require Origin.
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" as const : "lax" as const, path: "/api/guest-monitoring" });
export async function startIdentity(req: NextRequest, input: {
  purpose: VerificationPurpose; guestName: string; guestPhone: string; draftId?: string;
}) {
  if (resolveIdentityMode() === "sms_otp") return startOtp(req, input);
  const provider = getDanalProvider();
  const identity = guestIdentityHash(input.guestName, input.guestPhone);
  if (input.purpose === "apply") {
    if (!input.draftId) notFound();
    const draft = await prisma.guestMonitoring.findFirst({ where: {
      id: input.draftId!, guestIdentityHash: identity, status: "pending_payment", draftExpiresAt: { gt: new Date() },
    }, select: { id: true } });
    if (!draft) notFound();
  }
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
  response.cookies.set(BROWSER_COOKIE, browser, { ...cookieOptions(),
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", maxAge: SESSION_TTL / 1000 });
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
    verifiedAt: now, consumedAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL),
  } });
  if (consumed.count !== 1) throw new GuestError("verification_failed");
  return { rawToken, purpose: session.purpose };
}
export function attachSession(response: NextResponse, rawToken: string) {
  response.cookies.set(SESSION_COOKIE, rawToken, { ...cookieOptions(), maxAge: SESSION_TTL / 1000 });
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
  return session as typeof session & { verifiedIdentityHash: string };
}
export async function revokeSession(req: NextRequest, response: NextResponse) {
  const session = await requireSession(req);
  await prisma.guestVerificationSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(BROWSER_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}
