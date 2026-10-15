import { NextRequest, NextResponse } from "next/server";
import { validateOrigin } from "@/lib/csrf";
import { verifyCronSecret } from "@/lib/cron-auth";
import { GuestError, messages } from "./errors";
import { requireCrypto, requireEnabled } from "./config";
import { ipLimit } from "./rate-limit-keys";
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}
export function endpoint(run: (req: NextRequest) => Promise<Response>, options: { callback?: boolean; cron?: boolean; upload?: boolean } = {}) {
  return async (req: NextRequest) => {
    try {
      // No Guest* table access before feature/auth gates.
      requireEnabled();
      if (options.cron) {
        if (!verifyCronSecret(req.headers.get("authorization"))) throw new GuestError("unauthorized", 401);
      } else if (!options.callback) {
        if (!["GET", "HEAD"].includes(req.method)) {
          if (validateOrigin(req) || !req.headers.get("origin")) throw new GuestError("forbidden", 403);
        }
      }
      requireCrypto();
      const size = Number(req.headers.get("content-length") || 0);
      if (size > (options.upload ? 11 * 1024 * 1024 : 16384)) throw new GuestError("file_too_large", 413);
      // Callback IPs may be shared provider gateways; still bound work before parsing/HMAC/DB.
      if (!options.cron) await ipLimit(req, options.callback ? "callback" : "all", options.callback ? 120 : 60);
      return await run(req);
    } catch (error) {
      const e = error instanceof GuestError ? error : new GuestError("internal_error", 500);
      // Only non-sensitive classification goes into server logs.
      if (e.status >= 500) console.error("[GuestMonitoring]", e.code);
      return NextResponse.json({ error: messages[e.code] || "요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.", code: e.code },
        { status: e.status, headers: { "Cache-Control": "no-store", ...e.headers } });
    }
  };
}
/** Bounded body read also covers chunked requests (Content-Length alone is insufficient). */
export async function boundedBody(req: Request, limit: number) {
  const reader = req.body?.getReader();
  if (!reader) throw new GuestError("invalid_input");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new GuestError("file_too_large", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function readJson(req: Request): Promise<unknown> {
  try { return JSON.parse((await boundedBody(req, 16384)).toString("utf8")); }
  catch (e) { if (e instanceof GuestError) throw e; throw new GuestError("invalid_input"); }
}
