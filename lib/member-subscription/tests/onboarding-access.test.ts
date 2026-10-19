import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ find: vi.fn(), transaction: vi.fn(), release: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: f.transaction } }));
vi.mock("../config", () => ({ memberReleaseConfig: f.release }));
import { isOnboardingProtectedPath, onboardingAccessResponse } from "../onboarding-access";

const user = { id: "u1", role: "BUSINESS", requestedRole: null, verifyStatus: "verified",
  createdAt: new Date("2026-10-19"), membershipPolicy: null, subscription: null };
const url = new URL("https://vestra.ai.kr/dashboard?complete=true&role=ADMIN");
beforeEach(() => {
  vi.clearAllMocks();
  f.release.mockReturnValue({ effectiveAt: new Date("2026-10-18") });
  f.find.mockResolvedValue(user);
  f.transaction.mockImplementation(run => run({ user: { findUnique: f.find } }));
});
it.each(["/home", "/dashboard", "/dashboard/", "/realtor", "/landlord", "/rights", "/monitoring/123", "/renewal/monitoring", "/renewal/rights"])("protects direct entry to %s", async path => {
  const response = await onboardingAccessResponse("u1", new URL(path, url));
  expect(response?.status).toBe(307);
  expect(response?.headers.get("location")).toBe("https://vestra.ai.kr/signup/business/step-3");
  expect(response?.headers.get("cache-control")).toBe("no-store");
  expect(f.find.mock.calls.every(([query]) => query.where.id === "u1")).toBe(true);
});
it.each([
  "/login", "/signup", "/signup/complete", "/signup/business/step-4", "/verification",
  "/pricing", "/renewal/pricing", "/profile", "/applications/my", "/listings/my", "/chat",
  "/support", "/api/signup/onboarding-status", "/api/member-subscription/status",
  "/api/member-subscription/orders/1/recover", "/api/member-subscription/payment/callback",
  "/api/user/export", "/renewal/monitoring/guest/status", "/renewal/monitoring/guest/apply",
  "/dashboard-other", "/home-other", "/_next/static/app.js",
])("leaves recovery, own data, public and nonmatching path %s open", async path => {
  expect(isOnboardingProtectedPath(path)).toBe(false);
  expect(await onboardingAccessResponse("u1", new URL(path, url))).toBeNull();
  expect(f.transaction).not.toHaveBeenCalled();
});
it.each(["BUSINESS", "REALESTATE"])("blocks unpaid and trialing %s and routes unverified accounts to verification", async role => {
  for (const subscription of [null, { plan: "PREMIUM", status: "trialing", policyVersion: "v1", trialEndsAt: new Date("2099-01-01") }]) {
    f.find.mockResolvedValue({ ...user, role, subscription });
    expect((await onboardingAccessResponse("u1", url))?.status).toBe(307);
  }
  f.find.mockResolvedValue({ ...user, role, verifyStatus: "pending" });
  expect((await onboardingAccessResponse("u1", url))?.headers.get("location"))
    .toBe("https://vestra.ai.kr/signup/business/step-2");
});
it("allows paid, existing and free-eligible accounts", async () => {
  for (const patch of [
    { role: "PERSONAL" }, { role: "RENTAL_BIZ" }, { role: "ADMIN" }, { role: "LAWYER" },
    { createdAt: new Date(0) }, { membershipPolicy: { grandfatheredAt: new Date(0) } },
    { subscription: { plan: "PREMIUM", status: "active", policyVersion: "v1", endDate: new Date("2099-01-01") } },
  ]) {
    f.find.mockResolvedValue({ ...user, ...patch });
    expect(await onboardingAccessResponse("u1", url)).toBeNull();
  }
});
it("preserves release-off access", async () => {
  f.release.mockImplementation(() => { throw new Error("off"); });
  expect(await onboardingAccessResponse("u1", url)).toBeNull();
});
it("fails closed on DB failures and deleted sessions without leaking details", async () => {
  f.transaction.mockRejectedValue(new Error("private SQL"));
  const failed = await onboardingAccessResponse("u1", url);
  expect(failed?.status).toBe(503);
  expect(await failed?.json()).toEqual({ code: "provider_unavailable", error: expect.not.stringContaining("SQL") });
  f.transaction.mockImplementation(run => run({ user: { findUnique: f.find } }));
  f.find.mockResolvedValue(null);
  expect((await onboardingAccessResponse("u1", url))?.status).toBe(401);
});
