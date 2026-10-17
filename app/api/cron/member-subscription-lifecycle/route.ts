import { timingSafeEqual } from "node:crypto";
import { memberEndpoint, memberJson } from "@/lib/member-subscription/http";
import { runMemberLifecycle } from "@/lib/member-subscription/cron";
import { fail } from "@/lib/member-subscription/errors";
export const maxDuration = 180;
export async function GET(req: Request) {
  return memberEndpoint(async () => {
    const secret = process.env.CRON_SECRET;
    const value = Buffer.from(req.headers.get("authorization") ?? "");
    const expected = Buffer.from(secret ? `Bearer ${secret}` : "");
    if (!secret || value.length !== expected.length || !timingSafeEqual(value, expected)) fail("forbidden");
    return memberJson(await runMemberLifecycle());
  });
}
