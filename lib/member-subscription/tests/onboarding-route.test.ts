import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn(), resolve: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: f.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: f.query } }));
vi.mock("../onboarding", () => ({ resolveOnboardingState: f.resolve }));
import { MemberError } from "../errors";
import { GET } from "@/app/api/signup/onboarding-status/route";
const state = { stage: "pay", complete: false, requiresPaid: true, role: "REALESTATE", verifyStatus: "verified",
  premiumActive: false, isNewSignup: true, allowedPlans: ["PREMIUM"], freeAllowed: false };
beforeEach(() => {
  vi.clearAllMocks();
  f.auth.mockResolvedValue({ user: { id: "session-user" } });
  f.query.mockResolvedValue([{ count: 120, resetTime: new Date(Date.now() + 60_000) }]);
  f.resolve.mockResolvedValue(state);
});
it("requires authentication before rate limiting or reading user data", async () => {
  f.auth.mockResolvedValue(null);
  const response = await GET();
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "unauthorized", error: expect.any(String) });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(f.query).not.toHaveBeenCalled();
  expect(f.resolve).not.toHaveBeenCalled();
});
it("returns only the server-derived DTO for the session user without caching", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(state);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(f.resolve).toHaveBeenCalledExactlyOnceWith("session-user");
  expect(f.query).toHaveBeenCalledTimes(1);
});
it("enforces the 120 read limit and returns Retry-After without reading state", async () => {
  f.query.mockResolvedValue([{ count: 121, resetTime: new Date(Date.now() + 60_000) }]);
  const response = await GET();
  expect(response.status).toBe(429);
  expect(await response.json()).toEqual({ code: "rate_limited", error: expect.any(String) });
  expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(f.resolve).not.toHaveBeenCalled();
});
it("masks DB failure details with the existing API error envelope", async () => {
  f.resolve.mockRejectedValue(new Error("private internal details"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ code: "provider_unavailable", error: "현재 구독 결제를 이용할 수 없습니다." });
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("returns the documented forbidden envelope for unsupported persisted roles", async () => {
  f.resolve.mockRejectedValue(new MemberError("forbidden"));
  const response = await GET();
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ code: "forbidden", error: expect.any(String) });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
