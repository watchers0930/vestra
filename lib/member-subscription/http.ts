import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { MemberError, fail, type MemberErrorCode } from "./errors";
const MAX_BODY = 16 * 1024;
export function memberJson(value: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(value, { status, headers: { ...headers, "Cache-Control": "no-store" } });
}
export async function memberEndpoint(operation: () => Promise<Response>) {
  try { return await operation(); }
  catch (error) {
    const normalized = error instanceof MemberError ? error : new MemberError("provider_unavailable");
    if (!(error instanceof MemberError)) console.error("[MemberSubscription]", { event: "internal_failure" });
    return memberJson({ error: normalized.message, code: normalized.code }, normalized.status, normalized.headers);
  }
}
export function requireUser(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) return fail("unauthorized");
  return session.user.id;
}
export function assertMemberOrigin(req: Request) {
  const origins = new Set(["https://vestra.ai.kr", "https://www.vestra.ai.kr", "https://vestra-plum.vercel.app",
    "https://t-vestra.vercel.app", ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://localhost:3001"] : []),
    ...(process.env.ALLOWED_ORIGINS?.split(",").map(v => v.trim()).filter(Boolean) ?? []),
  ]);
  const origin = req.headers.get("origin");
  if (!origin || !origins.has(origin) || validateOrigin(req)) fail("forbidden");
}
export async function memberRateLimit(userId: string, scope: string, limit = 30) {
  const key = "member_sub:" + createHash("sha256").update(`${scope}:${userId}`).digest("hex");
  const reset = new Date(Date.now() + 60_000);
  // Single atomic statement; avoids read/create races and does not log DB errors.
  const rows = await prisma.$queryRaw<Array<{ count: number; resetTime: Date }>>`
    INSERT INTO "RateLimit" (id, count, "resetTime", "createdAt") VALUES (${key}, 1, ${reset}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      count = CASE WHEN "RateLimit"."resetTime" <= NOW() THEN 1 ELSE "RateLimit".count + 1 END,
      "resetTime" = CASE WHEN "RateLimit"."resetTime" <= NOW() THEN ${reset} ELSE "RateLimit"."resetTime" END
    RETURNING count, "resetTime"`;
  if (!rows[0] || rows[0].count > limit) throw new MemberError("rate_limited", {
    "Retry-After": String(Math.max(1, Math.ceil(((rows[0]?.resetTime ?? reset).getTime() - Date.now()) / 1000))),
    "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(Math.ceil((rows[0]?.resetTime ?? reset).getTime() / 1000)),
  });
}
export async function memberMutation(req: Request, userId: string) {
  assertMemberOrigin(req);
  const length = req.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY)) fail("payload_too_large");
  await memberRateLimit(userId, "mutation");
}
export async function memberBody<T>(req: Request, schema: z.ZodType<T>, code: MemberErrorCode = "invalid_input"): Promise<T> {
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") fail(code);
  const reader = req.body?.getReader();
  if (!reader) return fail(code);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_BODY) { await reader.cancel(); fail("payload_too_large"); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return fail(code); }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    if (code === "invalid_input" && parsed.error.issues.every(issue => issue.message === "invalid_duration")) fail("invalid_duration");
    return fail(code);
  }
  return parsed.data;
}
