import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

export const BROWSER_COOKIE = "guest_monitoring_browser";
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("base64url");
export function binding(req: NextRequest, browser: string) {
  return digest(JSON.stringify([browser, req.headers.get("user-agent") || ""]));
}
