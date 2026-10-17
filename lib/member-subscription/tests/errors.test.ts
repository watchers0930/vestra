import { expect, it } from "vitest";
import { GuestError } from "@/lib/guest-monitoring/errors";
import { MemberError, providerBoundary } from "../errors";
it.each([["payment_failed", 400], ["not_found", 404], ["payment_needs_review", 409]] as const)(
  "normalizes %s without leaking plumbing data", async (code, status) => {
    const error = await providerBoundary(async () => { throw new GuestError(code); }).catch(error => error);
    expect(error).toBeInstanceOf(MemberError); expect(error).toMatchObject({ code, status });
    expect(error.message).not.toBe(code);
  });
it.each([new Error("secret provider body"), { code: "unknown", message: "token" }, null])(
  "maps unknown provider errors to a sanitized 503", async source => {
    await expect(providerBoundary(async () => { throw source; })).rejects.toMatchObject({
      code: "provider_unavailable", status: 503, message: "현재 구독 결제를 이용할 수 없습니다.",
    });
  });
it("preserves an existing member error", async () => {
  const original = new MemberError("payment_pending");
  await expect(providerBoundary(async () => { throw original; })).rejects.toBe(original);
});
