/**
 * app/api/expert/request/route.ts 통합 테스트
 * 전문가 상담 요청 API — CSRF, Rate Limit, Input Validation, 성공 응답 검증
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Rate-limit 모킹 (route import 전에 선언)
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));

import { POST } from "@/app/api/expert/request/route";
import { rateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  body: object,
  headers: Record<string, string> = {}
): NextRequest {
  return new Request("http://localhost:3000/api/expert/request", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const validBody = {
  type: "전세 안전 검증",
  address: "서울시 강남구 테헤란로 123",
  content: "전세 계약 전 안전성 검증을 요청합니다. 보증금 3억원입니다.",
  contactPhone: "010-1234-5678",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/expert/request", () => {
  beforeEach(() => {
    vi.mocked(rateLimit).mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 86400000,
    });
  });

  // 1. 성공 케이스
  it("유효한 상담 요청 → 200 성공, requestId 존재", async () => {
    const req = makeRequest(validBody, { origin: "http://localhost:3000" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBeDefined();
    expect(data.requestId).toMatch(/^EXP-/);
  });

  // 2. CSRF 차단
  it("악의적 origin → 403 CSRF 차단", async () => {
    const req = makeRequest(validBody, { origin: "https://evil.com" });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  // 3. 유효하지 않은 상담 유형
  it("유효하지 않은 상담 유형 → 400", async () => {
    const req = makeRequest(
      { ...validBody, type: "무료 법률 상담" },
      { origin: "http://localhost:3000" }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("유효하지 않은 상담 유형");
  });

  // 4. 주소 5자 미만
  it("주소 5자 미만 → 400", async () => {
    const req = makeRequest(
      { ...validBody, address: "서울" },
      { origin: "http://localhost:3000" }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("주소를 5자 이상");
  });

  // 5. 문의 내용 10자 미만
  it("문의 내용 10자 미만 → 400", async () => {
    const req = makeRequest(
      { ...validBody, content: "짧은 내용" },
      { origin: "http://localhost:3000" }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("문의 내용을 10자 이상");
  });

  // 6. 연락처 미입력
  it("연락처 미입력 → 400", async () => {
    const { contactPhone: _cp, ...noContact } = validBody;
    const req = makeRequest(noContact, { origin: "http://localhost:3000" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("연락처");
  });

  // 7. 이메일만 입력해도 성공
  it("이메일만 입력해도 성공", async () => {
    const { contactPhone: _cp2, ...rest } = validBody;
    const body = { ...rest, contactEmail: "test@example.com" };
    const req = makeRequest(body, { origin: "http://localhost:3000" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.requestId).toMatch(/^EXP-/);
  });

  // 8. Rate limit 초과
  it("rate limit 초과 → 429", async () => {
    vi.mocked(rateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 86400000,
    });

    const req = makeRequest(validBody, { origin: "http://localhost:3000" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toContain("한도");
  });
});
