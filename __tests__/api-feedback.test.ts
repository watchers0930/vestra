/**
 * app/api/feedback/route.ts 통합 테스트
 * 피드백 API의 CSRF, Rate Limit, 입력 검증, 성공 경로, DB 실패 폴백 검증
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks (route import 전에 선언) ---

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
    weightFeedback: {
      create: vi.fn().mockResolvedValue({ id: "fb-1" }),
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    weightConfig: {
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 9,
    reset: Date.now() + 60000,
  }),
  rateLimitHeaders: vi.fn(() => ({})),
}));

vi.mock("@/lib/audit-log", () => ({
  createAuditLog: vi.fn(),
}));

vi.mock("@/lib/adaptive-weight-tuner", () => ({
  tuneWeights: vi.fn(),
}));

// --- Import (mock 선언 이후) ---

import { POST } from "@/app/api/feedback/route";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";

// --- Helper ---

function makeRequest(
  body: object,
  headers: Record<string, string> = {},
): NextRequest {
  return new Request("http://localhost:3000/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const VALID_BODY = {
  analysisId: "analysis-001",
  analysisType: "jeonse-safety",
  rating: "positive",
};

// --- Tests ---

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 기본 mock 리셋: 성공 경로
    vi.mocked(rateLimit).mockResolvedValue({
      success: true,
      remaining: 9,
      reset: Date.now() + 60000,
    });
    vi.mocked(prisma.systemSetting.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.weightFeedback.create).mockResolvedValue({ id: "fb-1" } as never);
    vi.mocked(prisma.weightFeedback.count).mockResolvedValue(0);
  });

  // ─────────────────────────────────────────────
  // 1. 허용된 origin에서 유효한 피드백 → 200 성공
  // ─────────────────────────────────────────────
  it("허용된 origin에서 유효한 피드백 → 200 성공", async () => {
    const req = makeRequest(VALID_BODY, { origin: "http://localhost:3000" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      message: "피드백이 기록되었습니다.",
      recalculated: false,
    });
  });

  // ─────────────────────────────────────────────
  // 2. 악의적 origin → 403 CSRF 차단
  // ─────────────────────────────────────────────
  it("악의적 origin → 403 CSRF 차단", async () => {
    const req = makeRequest(VALID_BODY, { origin: "https://evil.com" });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // 3. origin 없는 POST → 403 차단
  // ─────────────────────────────────────────────
  it("origin 없는 POST → 403 차단", async () => {
    const req = makeRequest(VALID_BODY); // origin/referer 헤더 없음
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  // ─────────────────────────────────────────────
  // 4. analysisId 누락 → 400
  // ─────────────────────────────────────────────
  it("analysisId 누락 → 400", async () => {
    const req = makeRequest(
      { analysisType: "jeonse-safety", rating: "positive" },
      { origin: "http://localhost:3000" },
    );
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("analysisId");
  });

  // ─────────────────────────────────────────────
  // 5. rating이 invalid 값 → 400
  // ─────────────────────────────────────────────
  it("rating이 invalid 값 → 400", async () => {
    const req = makeRequest(
      { analysisId: "a-1", analysisType: "jeonse-safety", rating: "neutral" },
      { origin: "http://localhost:3000" },
    );
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("rating");
  });

  // ─────────────────────────────────────────────
  // 6. rate limit 초과 시 429
  // ─────────────────────────────────────────────
  it("rate limit 초과 시 429", async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce({
      success: false,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const req = makeRequest(VALID_BODY, { origin: "http://localhost:3000" });
    const res = await POST(req);

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // 7. WeightFeedback 저장 실패 시 AuditLog 폴백으로 성공 반환
  // ─────────────────────────────────────────────
  it("WeightFeedback 저장 실패 시 AuditLog 폴백으로 성공 반환", async () => {
    vi.mocked(prisma.weightFeedback.create).mockRejectedValueOnce(
      new Error("DB connection refused"),
    );

    const req = makeRequest(VALID_BODY, { origin: "http://localhost:3000" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      message: "피드백이 기록되었습니다.",
      recalculated: false,
    });
    // AuditLog 폴백이 호출되었는지 확인
    expect(vi.mocked(createAuditLog)).toHaveBeenCalled();
  });
});
