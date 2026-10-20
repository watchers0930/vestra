import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const f = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), update: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: f.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: f.find, update: f.update } } }));
vi.mock("@/lib/audit-log", () => ({ logAuditWithRequest: f.audit }));
import { POST } from "@/app/api/user/setup-role/route";

const business = { businessNumber: "123-45-67890", companyName: "테스트 회사", representName: "테스트" };
function request(body: unknown, origin = "https://vestra.ai.kr") {
  return new NextRequest("https://vestra.ai.kr/api/user/setup-role", {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  f.auth.mockResolvedValue({ user: { id: "session-user" } });
  f.find.mockResolvedValue(null);
  f.update.mockResolvedValue({});
});

it("rejects unauthenticated requests before accessing storage", async () => {
  f.auth.mockResolvedValue(null);
  const response = await POST(request({ role: "PERSONAL" }));
  expect(response.status).toBe(401);
  expect(f.find).not.toHaveBeenCalled();
  expect(f.update).not.toHaveBeenCalled();
});
it("rejects an untrusted origin before authenticating or writing", async () => {
  expect((await POST(request({ role: "PERSONAL" }, "https://untrusted.invalid"))).status).toBe(403);
  expect(f.auth).not.toHaveBeenCalled();
  expect(f.update).not.toHaveBeenCalled();
});
it.each(["ADMIN", "LAWYER", "GUEST", "", null, 1])("rejects unsupported role %j", async role => {
  expect((await POST(request({ role }))).status).toBe(400);
  expect(f.update).not.toHaveBeenCalled();
});
it.each(["TENANT", "LANDLORD"])("stores PERSONAL subtype %s only for the session owner", async userType => {
  const response = await POST(request({ role: "PERSONAL", userType, userId: "other-user" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: expect.any(String) });
  expect(f.update).toHaveBeenCalledExactlyOnceWith({
    where: { id: "session-user" }, data: { role: "PERSONAL", userType },
  });
});
it.each(["RENTAL_BIZ", "BUSINESS", "REALESTATE"])("records %s as pending without elevating role", async role => {
  const response = await POST(request({ role, ...business }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: expect.any(String) });
  expect(f.update).toHaveBeenCalledExactlyOnceWith({
    where: { id: "session-user" }, data: { ...business, requestedRole: role, verifyStatus: "pending" },
  });
  expect(f.audit).toHaveBeenCalledOnce();
});
it.each(["RENTAL_BIZ", "BUSINESS", "REALESTATE"])("requests missing %s business information without writing", async role => {
  const response = await POST(request({ role }));
  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ needsBusinessInfo: true });
  expect(f.update).not.toHaveBeenCalled();
});
it("reuses stored business information as a pending application", async () => {
  f.find.mockResolvedValue({ companyName: business.companyName, role: "PERSONAL" });
  expect((await POST(request({ role: "BUSINESS" }))).status).toBe(200);
  expect(f.update).toHaveBeenCalledExactlyOnceWith({
    where: { id: "session-user" }, data: { requestedRole: "BUSINESS", verifyStatus: "pending" },
  });
});
it.each([
  { businessNumber: "short" }, { businessNumber: 1234567890 },
  { companyName: "a" }, { companyName: "a".repeat(51) },
  { representName: "a" }, { representName: "a".repeat(21) },
])("rejects invalid business input %j without writing", async patch => {
  expect((await POST(request({ role: "BUSINESS", ...business, ...patch }))).status).toBe(400);
  expect(f.update).not.toHaveBeenCalled();
});

it.each([null, [], "text", 12, true])("rejects non-object JSON %j before storage", async body => {
  expect((await POST(request(body))).status).toBe(400);
  expect(f.find).not.toHaveBeenCalled();
  expect(f.update).not.toHaveBeenCalled();
});
it.each(["", "{", '{"role":'])("returns 400 for malformed or empty JSON %j", async body => {
  const req = new NextRequest("https://vestra.ai.kr/api/user/setup-role", {
    method: "POST", headers: { origin: "https://vestra.ai.kr" }, body,
  });
  expect((await POST(req)).status).toBe(400);
  expect(f.update).not.toHaveBeenCalled();
});
it.each(["abcdefghij", "12345678901", "123-4567890", "12345-67890", "１２３４５６７８９０", "123-45-67890suffix"])("rejects malformed business number %s", async businessNumber => {
  expect((await POST(request({ role: "BUSINESS", ...business, businessNumber }))).status).toBe(400);
  expect(f.update).not.toHaveBeenCalled();
});
it.each(["1234567890", "123-45-67890"])("accepts and trims business number %s", async businessNumber => {
  expect((await POST(request({ role: "BUSINESS", ...business, businessNumber: ` ${businessNumber} ` }))).status).toBe(200);
  expect(f.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ businessNumber }) }));
  expect(f.audit).toHaveBeenCalledExactlyOnceWith({ userId: "session-user", action: "ROLE_CHANGE",
    detail: { requestedRole: "BUSINESS", status: "pending" } });
});
it.each([{ businessNumber: "bad" }, { companyName: "" }, { representName: null }, { businessNumber: false }])("does not bypass supplied field validation using stored information: %j", async patch => {
  f.find.mockResolvedValue({ companyName: business.companyName, role: "PERSONAL" });
  expect((await POST(request({ role: "BUSINESS", ...patch }))).status).toBe(400);
  expect(f.find).not.toHaveBeenCalled();
  expect(f.update).not.toHaveBeenCalled();
});
it.each(["read", "personal-write", "business-write", "reuse-write"])("normalizes %s storage failure to a safe 503", async failure => {
  const privateError = new Error("private database input and connection details");
  if (failure === "read") f.find.mockRejectedValue(privateError);
  else f.update.mockRejectedValue(privateError);
  if (failure === "reuse-write") f.find.mockResolvedValue({ companyName: business.companyName });
  const body = failure === "personal-write" ? { role: "PERSONAL" }
    : failure === "business-write" ? { role: "BUSINESS", ...business } : { role: "BUSINESS" };
  const response = await POST(request(body));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: expect.any(String) });
  expect(f.audit).not.toHaveBeenCalled();
});
