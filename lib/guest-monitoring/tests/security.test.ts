import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { signMockCallback, verifyCallback } from "@/lib/danal/callback";
import { getDanalProvider } from "@/lib/danal";
import { orderSchema, identityStartSchema, applicantSchema } from "../schemas";
import { guestIdentityHash } from "../identity-hash";
import { endpoint, json, readJson } from "../http";
import { encryptWriteTree, decryptReadTree } from "@/lib/pii-crypto-tree";
import { extractRegistryFields } from "../pdf-extraction";
import { SAMPLE_REGISTRY_TEXT, parseRegistry } from "@/lib/registry-parser";
import { createDraft } from "../draft";
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@127.0.0.1:55439/vestra_guest_isolated");
  vi.stubEnv("GUEST_MONITORING_ENABLED", "true");
  vi.stubEnv("PII_ENCRYPTION_KEY", "test-encryption-key-for-isolated-tests-only");
  vi.stubEnv("PII_SALT", "test-isolated-salt");
  vi.stubEnv("SEARCH_INDEX_KEY", "test-isolated-search");
  vi.stubEnv("DANAL_MOCK_SECRET", "test-callback-secret-for-isolated-tests-only");
  vi.stubEnv("DANAL_PROVIDER", "mock");
  vi.stubEnv("GUEST_MONITORING_MOCK_ISOLATED", "true");
});
afterEach(() => vi.unstubAllEnvs());
describe("guest boundaries", () => {
  it("rejects fake success and tampered signed callbacks", () => {
    expect(() => verifyCallback({ success: true }, "identity")).toThrow();
    const envelope = signMockCallback("identity", { nonce: "test" });
    expect(verifyCallback(envelope, "identity").nonce).toBe("test");
    expect(() => verifyCallback({ ...envelope, payload: envelope.payload + "A" }, "identity")).toThrow();
    expect(() => verifyCallback(envelope, "payment")).toThrow();
  });
  it("blocks production mock and unconfigured real provider", () => {
    expect(getDanalProvider().mode).toBe("mock");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@db.example.com/production");
    expect(() => getDanalProvider()).toThrow();
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getDanalProvider()).toThrow();
    vi.stubEnv("DANAL_PROVIDER", "danal");
    expect(() => getDanalProvider()).toThrow();
  });
  it("normalizes identity and rejects injected price/owner fields", () => {
    expect(guestIdentityHash("홍길동", "010-1234-5678")).toBe(guestIdentityHash(" 홍길동 ", "+82 10 1234 5678"));
    const valid = { purpose: "initial", draftId: "draft", idempotencyKey: "10000000-0000-4000-8000-000000000001" };
    expect(orderSchema.safeParse(valid).success).toBe(true);
    expect(orderSchema.safeParse({ ...valid, amount: 1 }).success).toBe(false);
    expect(identityStartSchema.safeParse({ purpose: "apply", guestName: "홍길동", guestPhone: "01012345678" }).success).toBe(false);
    expect(applicantSchema.safeParse({ guestName: "홍길동", guestPhone: "01012345678", address: "서울 중구 1", ownerName: "홍길동" }).success).toBe(false);
  });
  it("encrypts Guest PII through nested relations and decrypts once", () => {
    const tree = { guestMonitoring: { create: { guestName: "홍길동", guestPhone: "01012345678", address: "서울 중구", ownerName: "홍길동" } } };
    encryptWriteTree(tree, "GuestMonitoringOrder");
    expect(tree.guestMonitoring.create.guestName).toMatch(/^v2:/);
    const encrypted = tree.guestMonitoring.create.guestName;
    encryptWriteTree(tree, "GuestMonitoringOrder");
    expect(tree.guestMonitoring.create.guestName).toBe(encrypted);
    const read = { guestMonitoring: tree.guestMonitoring.create };
    decryptReadTree(read, "GuestMonitoringOrder");
    expect(read.guestMonitoring.guestName).toBe("홍길동");
  });
  it("feature off returns 404 before body/DB access", async () => {
    vi.stubEnv("GUEST_MONITORING_ENABLED", "false");
    const called = vi.fn(async () => json({ secret: true }));
    const response = await endpoint(called)(new NextRequest("http://localhost/api/guest-monitoring/properties"));
    expect(response.status).toBe(404);
    expect(called).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects missing Origin before rate limiter or mutation", async () => {
    const response = await endpoint(async () => json({ ok: true }))(new NextRequest("http://localhost/api/test", { method: "POST" }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "forbidden" });
  });
  it("bounds chunked JSON bodies", async () => {
    await expect(readJson(new Request("http://localhost", { method: "POST", body: "x".repeat(17000) }))).rejects.toMatchObject({ status: 413 });
  });
  it("extracts a single registry and matches its address", () => {
    const address = parseRegistry(SAMPLE_REGISTRY_TEXT).title.address;
    const result = extractRegistryFields(SAMPLE_REGISTRY_TEXT, address);
    expect(result.commUniqueNo).toBe("1101-2024-012345");
    expect(result.ownerName.length).toBeGreaterThan(1);
    expect(() => extractRegistryFields(SAMPLE_REGISTRY_TEXT, "부산 다른주소 1")).toThrow("address_mismatch");
  });
  it("rejects empty, spoofed and oversized PDF files before storing a draft", async () => {
    const form = new FormData();
    form.set("guestName", "홍길동"); form.set("guestPhone", "01012345678"); form.set("address", "서울 중구 테스트로 1");
    form.set("file", new File([], "empty.pdf", { type: "application/pdf" }));
    await expect(createDraft(form)).rejects.toMatchObject({ code: "invalid_pdf" });
    form.set("file", new File(["not a PDF"], "fake.pdf", { type: "application/pdf" }));
    await expect(createDraft(form)).rejects.toMatchObject({ code: "invalid_pdf" });
    form.set("file", new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" }));
    await expect(createDraft(form)).rejects.toMatchObject({ status: 413, code: "file_too_large" });
  });
  it("rejects unrelated and ambiguous multiple-property documents", () => {
    expect(() => extractRegistryFields("unrelated document", "서울 중구")).toThrow("not_registry");
    expect(() => extractRegistryFields("표제부 갑구 을구 소유권 고유번호 1234-1234-123456 고유번호 5678-1234-123456", "서울 중구")).toThrow("multiple_properties");
  });
});
