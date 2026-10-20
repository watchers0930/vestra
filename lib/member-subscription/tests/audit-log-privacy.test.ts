import { beforeEach, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { auditLog: { create: f.create } } }));
vi.mock("@/lib/system-settings", () => ({ maskValue: (value: string) => `masked:${value.length}` }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
import { logAudit, logAuditWithRequest, createAuditLog } from "@/lib/audit-log";

beforeEach(() => {
  vi.clearAllMocks();
  f.create.mockResolvedValue({});
});
it("fully redacts business PII in objects and nested arrays for every entry point", async () => {
  const detail = {
    companyName: "example company", representName: "홍길동", businessNumber: "123-45-67890",
    nested: [{ COMPANY_NAME: "example company", represent_name: "홍길동" },
      [{ business_number: "123-45-67890", token: "private-token" }]],
    requestedRole: "BUSINESS", status: "pending",
  };
  logAudit({ action: "ROLE_CHANGE", detail });
  await logAuditWithRequest({ action: "ROLE_CHANGE", detail });
  createAuditLog({ action: "ROLE_CHANGE", detail });
  expect(f.create).toHaveBeenCalledTimes(3);
  for (const [args] of f.create.mock.calls) {
    expect(JSON.parse(args.data.detail)).toEqual({
      companyName: "****", representName: "****", businessNumber: "****",
      nested: [{ COMPANY_NAME: "****", represent_name: "****" },
        [{ business_number: "****", token: "masked:13" }]],
      requestedRole: "BUSINESS", status: "pending",
    });
  }
  expect(detail.representName).toBe("홍길동");
});
it("does not emit raw Prisma errors that can contain the original PII", async () => {
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    f.create.mockRejectedValue(new Error("private database record"));
    logAudit({ action: "ROLE_CHANGE", detail: { representName: "홍길동" } });
    await Promise.resolve();
    expect(errorLog).toHaveBeenCalledExactlyOnceWith("[AuditLog] 기록 실패:", expect.any(Error));
    expect(errorLog.mock.calls[0][1]).toMatchObject({ message: "감사 로그를 저장할 수 없습니다" });
  } finally {
    errorLog.mockRestore();
  }
});
