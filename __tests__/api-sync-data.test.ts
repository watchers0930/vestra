/**
 * API 통합 테스트 — /api/user/sync-data
 *
 * POST: localStorage 데이터 서버 동기화
 * GET: 사용자 분석/자산 데이터 조회
 * DELETE: 분석 데이터 삭제
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    analysis: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    asset: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { POST, GET, DELETE } from "@/app/api/user/sync-data/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Helpers ────────────────────────────────────────────────────────

function makeRequest(
  method: string,
  body?: object,
  headers: Record<string, string> = {}
): NextRequest {
  const init: RequestInit = {
    method,
    headers: { "content-type": "application/json", ...headers },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request("http://localhost:3000/api/user/sync-data", init) as unknown as NextRequest;
}

/** 인증된 세션 mock 설정 */
function mockAuthenticated() {
  vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
}

// ── Setup ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════════
// POST /api/user/sync-data
// ════════════════════════════════════════════════════════════════════

describe("POST /api/user/sync-data", () => {
  const validOrigin = { origin: "http://localhost:3000" };

  it("미인증 → 401", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const req = makeRequest("POST", { type: "analysis", data: {} }, validOrigin);
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("인증 필요");
  });

  it("CSRF 실패 → 403", async () => {
    mockAuthenticated();

    const req = makeRequest(
      "POST",
      { type: "analysis", data: {} },
      { origin: "https://evil.com" }
    );
    const res = await POST(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("잘못된 요청 출처입니다");
  });

  it("type 누락 → 400", async () => {
    mockAuthenticated();

    const req = makeRequest("POST", { data: { id: "x" } }, validOrigin);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("type과 data는 필수입니다.");
  });

  it("analysis 신규 생성 성공", async () => {
    mockAuthenticated();
    vi.mocked(prisma.analysis.findUnique).mockResolvedValue(null as any);
    vi.mocked(prisma.analysis.create).mockResolvedValue({ id: "a1" } as any);

    const req = makeRequest(
      "POST",
      {
        type: "analysis",
        data: {
          id: "a1",
          type: "jeonse",
          typeLabel: "전세",
          address: "서울",
          summary: "요약",
          data: { score: 80 },
        },
      },
      validOrigin
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, synced: "analysis", id: "a1" });
    expect(prisma.analysis.create).toHaveBeenCalledOnce();
  });

  it("analysis 기존 업데이트 — 다른 사용자 소유 → 403", async () => {
    mockAuthenticated();
    vi.mocked(prisma.analysis.findUnique).mockResolvedValue({
      id: "a1",
      userId: "other-user",
    } as any);

    const req = makeRequest(
      "POST",
      {
        type: "analysis",
        data: {
          id: "a1",
          type: "jeonse",
          typeLabel: "전세",
          address: "서울",
          summary: "요약",
        },
      },
      validOrigin
    );
    const res = await POST(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("권한 없음");
  });

  it("asset upsert 성공", async () => {
    mockAuthenticated();
    vi.mocked(prisma.asset.upsert).mockResolvedValue({ id: "b1" } as any);

    const req = makeRequest(
      "POST",
      {
        type: "asset",
        data: {
          id: "b1",
          address: "서울 강남구",
          type: "아파트",
          estimatedPrice: 500000000,
          safetyScore: 80,
          riskScore: 20,
        },
      },
      validOrigin
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, synced: "asset", id: "b1" });
    expect(prisma.asset.upsert).toHaveBeenCalledOnce();
  });
});

// ════════════════════════════════════════════════════════════════════
// GET /api/user/sync-data
// ════════════════════════════════════════════════════════════════════

describe("GET /api/user/sync-data", () => {
  it("미인증 → 401", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("인증 필요");
  });

  it("인증 후 데이터 반환", async () => {
    mockAuthenticated();

    const now = new Date();
    vi.mocked(prisma.analysis.findMany).mockResolvedValue([
      {
        id: "a1",
        type: "jeonse",
        typeLabel: "전세",
        address: "서울",
        summary: "요약",
        data: "{}",
        createdAt: now,
      },
    ] as any);
    vi.mocked(prisma.asset.findMany).mockResolvedValue([
      {
        id: "b1",
        address: "서울",
        type: "아파트",
        estimatedPrice: 500000000,
        jeonsePrice: null,
        safetyScore: 80,
        riskScore: 20,
        lastAnalyzedDate: now,
        priceHistory: null,
      },
    ] as any);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();

    // analyses
    expect(body.analyses).toHaveLength(1);
    expect(body.analyses[0]).toMatchObject({
      id: "a1",
      type: "jeonse",
      typeLabel: "전세",
      address: "서울",
      summary: "요약",
      data: {},
    });
    expect(body.analyses[0].date).toBe(now.toISOString());

    // assets
    expect(body.assets).toHaveLength(1);
    expect(body.assets[0]).toMatchObject({
      id: "b1",
      address: "서울",
      type: "아파트",
      estimatedPrice: 500000000,
      safetyScore: 80,
      riskScore: 20,
    });
    expect(body.assets[0].lastAnalyzedDate).toBe(now.toISOString());
  });
});

// ════════════════════════════════════════════════════════════════════
// DELETE /api/user/sync-data
// ════════════════════════════════════════════════════════════════════

describe("DELETE /api/user/sync-data", () => {
  it("미인증 → 401", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const req = makeRequest("DELETE", { analysisId: "a1" });
    const res = await DELETE(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("인증 필요");
  });

  it("analysisId 누락 → 400", async () => {
    mockAuthenticated();

    const req = makeRequest("DELETE", {});
    const res = await DELETE(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("analysisId 또는 assetId는 필수입니다.");
  });

  it("정상 삭제 → 200", async () => {
    mockAuthenticated();
    vi.mocked(prisma.analysis.deleteMany).mockResolvedValue({ count: 1 } as any);

    const req = makeRequest("DELETE", { analysisId: "a1" });
    const res = await DELETE(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, deleted: "a1" });
    expect(prisma.analysis.deleteMany).toHaveBeenCalledWith({
      where: { id: "a1", userId: "user-123" },
    });
  });
});
