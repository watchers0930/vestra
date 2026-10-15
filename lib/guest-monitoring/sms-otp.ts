import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import type { GuestIdentityStartRequest } from "@/types/guest-monitoring";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/solapi-client";
import { guestIdentityHash, normalizeGuestPhone } from "./identity-hash";
import { BROWSER_COOKIE, binding, digest, token } from "./session-binding";
import { OTP_TTL, resolveIdentityMode } from "./identity-mode";
import { SESSION_TTL } from "./config";
import { GuestError, notFound, unavailable } from "./errors";
import { guestLimit } from "./rate-limit-keys";
import { limitIdentityCost } from "./identity-cost";

export function otpDigest(input: { nonce: string; inputIdentityHash: string; code: string }) {
  return digest(JSON.stringify(["sms_otp_v1", input.nonce, input.inputIdentityHash, input.code]));
}

async function validDraft(id: string | null | undefined, identity: string, now: Date) {
  if (!id) return null;
  return prisma.guestMonitoring.findFirst({ where: {
    id, guestIdentityHash: identity, status: "pending_payment", draftExpiresAt: { gt: now },
  }, select: { id: true } });
}

export async function startOtp(req: NextRequest, input: GuestIdentityStartRequest) {
  if (resolveIdentityMode() !== "sms_otp") notFound();
  const now = new Date();
  const identity = guestIdentityHash(input.guestName, input.guestPhone);
  if (input.purpose === "apply" && !await validDraft(input.draftId, identity, now)) notFound();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const browser = req.cookies.get(BROWSER_COOKIE)?.value || token();
  const nonce = token();
  const browserBindingHash = binding(req, browser);
  const expiresAt = new Date(now.getTime() + OTP_TTL);
  // A resend invalidates previous pending codes, without revoking verified sessions.
  await prisma.guestVerificationSession.updateMany({ where: {
    purpose: input.purpose, inputIdentityHash: identity, browserBindingHash,
    providerTxId: { startsWith: "otp:" }, verifiedAt: null, consumedAt: null, revokedAt: null,
  }, data: { revokedAt: now } });
  const session = await prisma.guestVerificationSession.create({ data: {
    tokenHash: digest(token()), requestNonce: nonce, purpose: input.purpose,
    draftId: input.draftId, inputIdentityHash: identity, browserBindingHash, expiresAt,
    providerTxId: `otp:${otpDigest({ nonce, inputIdentityHash: identity, code })}`,
  }, select: { id: true } });
  try {
    await limitIdentityCost();
  } catch (error) {
    await prisma.guestVerificationSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    throw error;
  }
  try {
    const result = await sendSms(normalizeGuestPhone(input.guestPhone),
      `[VESTRA] 인증번호 [${code}]를 입력해주세요. 유효시간은 5분입니다.`, { requireReal: true });
    if (result.success !== true || result.channel !== "sms") unavailable();
  } catch {
    await prisma.guestVerificationSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    unavailable();
  }
  const launch: Record<string, string> = { mode: "sms_otp", verificationId: session.id };
  return { data: { verificationId: session.id, launch, expiresAt: expiresAt.toISOString() }, browser };
}

export async function verifyOtp(req: NextRequest, input: { verificationId: string; code: string }) {
  if (resolveIdentityMode() !== "sms_otp") notFound();
  await guestLimit("otp-verify-id", input.verificationId, 5, 600_000);
  const session = await prisma.guestVerificationSession.findUnique({ where: { id: input.verificationId } });
  const failed = () => new GuestError("verification_failed");
  if (!session || (session.purpose !== "apply" && session.purpose !== "status") ||
      !session.providerTxId?.startsWith("otp:")) throw failed();
  await guestLimit("otp-verify-nonce", session.requestNonce, 5, 600_000);
  const browser = req.cookies.get(BROWSER_COOKIE)?.value;
  if (!browser || binding(req, browser) !== session.browserBindingHash) throw failed();
  let now = new Date();
  if (session.verifiedAt || session.consumedAt || session.revokedAt || session.expiresAt <= now) throw failed();
  const expected = session.providerTxId.slice(4);
  const actual = otpDigest({ nonce: session.requestNonce, inputIdentityHash: session.inputIdentityHash, code: input.code });
  if (!/^[a-f0-9]{64}$/.test(expected) || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) throw failed();
  if (session.purpose === "apply" && !await validDraft(session.draftId, session.inputIdentityHash, now)) throw failed();
  const rawToken = token();
  now = new Date();
  const consumed = await prisma.guestVerificationSession.updateMany({ where: {
    id: session.id, providerTxId: session.providerTxId, inputIdentityHash: session.inputIdentityHash,
    browserBindingHash: binding(req, browser), verifiedAt: null, consumedAt: null, revokedAt: null,
    expiresAt: { gt: now },
  }, data: {
    tokenHash: digest(rawToken), verifiedIdentityHash: session.inputIdentityHash,
    verifiedAt: now, consumedAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL),
    providerTxId: `sms_otp_verified:${randomUUID()}`,
  } });
  if (consumed.count !== 1) throw failed();
  return { rawToken, browser, purpose: session.purpose };
}
