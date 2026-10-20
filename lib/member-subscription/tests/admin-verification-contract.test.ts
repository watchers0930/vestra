import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const f = vi.hoisted(() => ({ auth: vi.fn(), list: vi.fn(), find: vi.fn(), update: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: f.auth, ROLE_LIMITS: { PERSONAL: 5, RENTAL_BIZ: 50, BUSINESS: 50, REALESTATE: 100 } }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findMany: f.list, findUnique: f.find, update: f.update } } }));
vi.mock("@/lib/audit-log", () => ({ createAuditLog: f.audit }));
import { GET, POST } from "@/app/api/admin/verify/route";

const context = { params: Promise.resolve({}) };
function request(body?: unknown, origin = "https://vestra.ai.kr") {
  return new NextRequest("https://vestra.ai.kr/api/admin/verify", body === undefined ? {} : {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  f.auth.mockResolvedValue({ user: { id: "fixture-admin", role: "ADMIN" } });
  f.find.mockResolvedValue({ verifyStatus: "pending", requestedRole: "BUSINESS" });
  f.update.mockResolvedValue({});
});

it.each([null, "PERSONAL", "RENTAL_BIZ", "BUSINESS", "REALESTATE", "LAWYER"])("denies verification reads and writes for %j", async role => {
  f.auth.mockResolvedValue(role ? { user: { id: "fixture-user", role } } : null);
  expect((await GET(request(), context)).status).toBe(403);
  expect((await POST(request({ userId: "target", action: "approve" }), context)).status).toBe(403);
  expect(f.list).not.toHaveBeenCalled();
  expect(f.find).not.toHaveBeenCalled();
  expect(f.update).not.toHaveBeenCalled();
});
it("returns the pending list with only the contracted selected columns", async () => {
  f.list.mockResolvedValue([]);
  const response = await GET(request(), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
  expect(f.list).toHaveBeenCalledExactlyOnceWith({
    where: { verifyStatus: "pending" }, orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, image: true, requestedRole: true,
      businessNumber: true, companyName: true, representName: true, createdAt: true },
  });
});
it.each([["RENTAL_BIZ", 50], ["BUSINESS", 50], ["REALESTATE", 100]] as const)("approves the requested %s role with its daily limit", async (role, dailyLimit) => {
  f.find.mockResolvedValue({ verifyStatus: "pending", requestedRole: role });
  const response = await POST(request({ userId: "target", action: "approve" }), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: expect.any(String), role, dailyLimit });
  expect(f.update).toHaveBeenCalledExactlyOnceWith({ where: { id: "target" },
    data: { role, dailyLimit, verifyStatus: "verified", requestedRole: null } });
  expect(f.audit).toHaveBeenCalledWith(expect.objectContaining({
    userId: "fixture-admin", action: "admin:approve-verification", target: "user:target",
  }));
});
it("rejects an application without assigning a new role", async () => {
  const response = await POST(request({ userId: "target", action: "reject" }), context);
  expect(response.status).toBe(200);
  expect(f.update).toHaveBeenCalledExactlyOnceWith({ where: { id: "target" },
    data: { verifyStatus: "rejected", requestedRole: null } });
  expect(f.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "admin:reject-verification" }));
});
it.each([null, { verifyStatus: "verified" }, { verifyStatus: "rejected" }])("rejects a stale approval target %j", async target => {
  f.find.mockResolvedValue(target);
  expect((await POST(request({ userId: "target", action: "approve" }), context)).status).toBe(404);
  expect(f.update).not.toHaveBeenCalled();
});
it("checks CSRF before approval, including for administrators", async () => {
  const response = await POST(request({ userId: "target", action: "approve" }, "https://untrusted.invalid"), context);
  expect(response.status).toBe(403);
  expect(f.auth).not.toHaveBeenCalled();
  expect(f.update).not.toHaveBeenCalled();
});

it.each([null, [], "text", 1, true, {}, { userId: 123, action: "approve" }, { userId: " ", action: "reject" },
  { userId: "target", action: [] }])("rejects invalid JSON shape or fields %j", async body => {
  expect((await POST(request(body), context)).status).toBe(400);
  expect(f.find).not.toHaveBeenCalled();
  expect(f.update).not.toHaveBeenCalled();
});
it.each(["", "{", '{"userId":'])("returns 400 for malformed or empty JSON %j", async body => {
  const req = new NextRequest("https://vestra.ai.kr/api/admin/verify", {
    method: "POST", headers: { origin: "https://vestra.ai.kr" }, body,
  });
  expect((await POST(req, context)).status).toBe(400);
  expect(f.find).not.toHaveBeenCalled();
  expect(f.update).not.toHaveBeenCalled();
});
it.each(["list", "read", "approve", "reject"])("normalizes %s DB errors without leaking details or logging success", async failure => {
  const error = new Error("private database input and connection details");
  f.list.mockRejectedValue(error);
  if (failure === "read") f.find.mockRejectedValue(error);
  else f.update.mockRejectedValue(error);
  const response = failure === "list" ? await GET(request(), context)
    : await POST(request({ userId: "target", action: failure === "reject" ? "reject" : "approve" }), context);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: expect.any(String) });
  expect(f.audit).not.toHaveBeenCalled();
});
it("preserves the explicit business role override", async () => {
  const response = await POST(request({ userId: "target", action: "approve", role: "REALESTATE" }), context);
  expect(response.status).toBe(200);
  expect(f.update).toHaveBeenCalledWith({ where: { id: "target" }, data: {
    role: "REALESTATE", verifyStatus: "verified", dailyLimit: 100, requestedRole: null,
  } });
});
it.each(["ADMIN", "unknown", {}, null, ""])("rejects invalid explicit role %j before accessing storage", async role => {
  expect((await POST(request({ userId: "target", action: "approve", role }), context)).status).toBe(400);
  expect(f.find).not.toHaveBeenCalled();
  expect(f.update).not.toHaveBeenCalled();
});
it("preserves the default BUSINESS role for legacy applications without a requested role", async () => {
  f.find.mockResolvedValue({ verifyStatus: "pending", requestedRole: null });
  const response = await POST(request({ userId: "target", action: "approve" }), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ role: "BUSINESS", dailyLimit: 50 });
});
it.each(["ADMIN", "unknown"])("does not elevate a corrupt stored requested role %s", async requestedRole => {
  f.find.mockResolvedValue({ verifyStatus: "pending", requestedRole });
  expect((await POST(request({ userId: "target", action: "approve" }), context)).status).toBe(400);
  expect(f.update).not.toHaveBeenCalled();
  expect(f.audit).not.toHaveBeenCalled();
});
