/**
 * Admin API Routes — 통합 테스트
 * ───────────────────────────────
 * 대상:
 *   1. /api/admin/integrity-audit   (GET, POST)  ~150 lines
 *   2. /api/admin/guarantee-rules   (GET, PUT)   ~65 lines
 *   3. /api/admin/account           (PUT)         ~66 lines
 *   4. /api/admin/news              (GET, DELETE) ~52 lines
 *   5. /api/admin/loan-rates        (GET, POST)   ~44 lines
 *   6. /api/admin/analyses          (GET)          ~30 lines
 *
 * Mock 전략:
 *   - withAdminAuth → @/lib/auth 를 모킹하여 세션 제어
 *   - prisma        → 전역 모킹
 *   - csrf          → validateOrigin 기본 통과
 *   - IntegrityChain / audit-log → 동작 모킹
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────
// 1. 모듈 모킹 (vi.hoisted로 호이스팅 안전하게 선언)
// ─────────────────────────────────────────────────────────────

const {
  mockPrisma,
  mockAuth,
  mockBcrypt,
  mockGetCachedRates,
  mockFetchFSSLoanRates,
} = vi.hoisted(() => {
  const mockPrisma = {
    integrityRecord: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      update: vi.fn(),
    },
    guaranteeRule: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    newsArticle: {
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    analysis: {
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockReturnValue({ catch: vi.fn() }),
    },
    $transaction: vi.fn(),
  };

  const mockAuth = vi.fn();

  const mockBcrypt = {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("hashed-new-password"),
  };

  const mockGetCachedRates = vi.fn();
  const mockFetchFSSLoanRates = vi.fn();

  return { mockPrisma, mockAuth, mockBcrypt, mockGetCachedRates, mockFetchFSSLoanRates };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/csrf", () => ({
  validateOrigin: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/audit-log", () => ({
  createAuditLog: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/integrity-chain", () => {
  const mockChain = {
    addStep: vi.fn().mockResolvedValue(undefined),
    finalize: vi.fn().mockResolvedValue("mock-merkle-root"),
    verify: vi.fn().mockResolvedValue({ chainLinksValid: true }),
  };
  return {
    IntegrityChain: vi.fn().mockImplementation(() => mockChain),
  };
});

vi.mock("bcryptjs", () => ({
  default: mockBcrypt,
}));

vi.mock("@/lib/fss-loan-api", () => ({
  getCachedRates: mockGetCachedRates,
  fetchFSSLoanRates: mockFetchFSSLoanRates,
}));

// ─────────────────────────────────────────────────────────────
// 2. Route import (모킹 뒤에 위치해야 함)
// ─────────────────────────────────────────────────────────────

import {
  GET as integrityAuditGET,
  POST as integrityAuditPOST,
} from "@/app/api/admin/integrity-audit/route";

import {
  GET as guaranteeRulesGET,
  PUT as guaranteeRulesPUT,
} from "@/app/api/admin/guarantee-rules/route";

import { PUT as accountPUT } from "@/app/api/admin/account/route";

import {
  GET as newsGET,
  DELETE as newsDELETE,
} from "@/app/api/admin/news/route";

import {
  GET as loanRatesGET,
  POST as loanRatesPOST,
} from "@/app/api/admin/loan-rates/route";

import { GET as analysesGET } from "@/app/api/admin/analyses/route";

// ─────────────────────────────────────────────────────────────
// 3. Helpers
// ─────────────────────────────────────────────────────────────

const ADMIN_SESSION = {
  user: { id: "admin-1", role: "ADMIN", email: "admin@vestra.kr", name: "Admin" },
};

const USER_SESSION = {
  user: { id: "user-1", role: "USER", email: "user@example.com", name: "User" },
};

/** withAdminAuth 래퍼가 사용하는 routeContext */
const routeCtx = { params: Promise.resolve({}) };

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function makePostRequest(url: string, body: object = {}): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

function makePutRequest(url: string, body: object): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(url: string, body: object): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────
// 4. Tests
// ─────────────────────────────────────────────────────────────

describe("Admin API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: 관리자 세션 활성
    mockAuth.mockResolvedValue(ADMIN_SESSION);
  });

  // ═══════════════════════════════════════════════════════════
  // A. /api/admin/integrity-audit
  // ═══════════════════════════════════════════════════════════

  describe("GET /api/admin/integrity-audit", () => {
    const url = "http://localhost:3000/api/admin/integrity-audit";

    it("관리자 미인증 → 403", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makeGetRequest(url);
      const res = await integrityAuditGET(req, routeCtx);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("일반 사용자 → 403", async () => {
      mockAuth.mockResolvedValue(USER_SESSION);

      const req = makeGetRequest(url);
      const res = await integrityAuditGET(req, routeCtx);

      expect(res.status).toBe(403);
    });

    it("정상 조회 → records, stats, pagination 포함", async () => {
      const mockRecord = {
        id: "rec-1",
        analysisId: "a-1",
        analysisType: "jeonse",
        address: "서울시 강남구",
        steps: 5,
        stepsData: [],
        merkleRoot: "root-hash",
        isValid: true,
        verifiedAt: new Date(),
        createdAt: new Date(),
      };

      mockPrisma.integrityRecord.findMany.mockResolvedValue([mockRecord]);
      mockPrisma.integrityRecord.count
        .mockResolvedValueOnce(1)   // total for pagination
        .mockResolvedValueOnce(10)  // validCount
        .mockResolvedValueOnce(2)   // invalidCount
        .mockResolvedValueOnce(12); // totalRecords
      mockPrisma.integrityRecord.aggregate.mockResolvedValue({
        _avg: { steps: 4.5 },
      });

      const req = makeGetRequest(url);
      const res = await integrityAuditGET(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.records).toHaveLength(1);
      expect(data.records[0].id).toBe("rec-1");
      expect(data.stats).toMatchObject({
        valid: 10,
        invalid: 2,
      });
      expect(data.pagination).toMatchObject({
        page: 1,
        limit: 20,
      });
    });

    it("type 필터 적용 시 where 조건에 반영", async () => {
      mockPrisma.integrityRecord.findMany.mockResolvedValue([]);
      mockPrisma.integrityRecord.count.mockResolvedValue(0);
      mockPrisma.integrityRecord.aggregate.mockResolvedValue({
        _avg: { steps: 0 },
      });

      const req = makeGetRequest(`${url}?type=jeonse&page=2&limit=5`);
      const res = await integrityAuditGET(req, routeCtx);

      expect(res.status).toBe(200);
      expect(mockPrisma.integrityRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { analysisType: "jeonse" },
          skip: 5,
          take: 5,
        })
      );
    });

    it("page/limit 경계값 처리 — 음수 page는 1로, limit > 100은 100으로", async () => {
      mockPrisma.integrityRecord.findMany.mockResolvedValue([]);
      mockPrisma.integrityRecord.count.mockResolvedValue(0);
      mockPrisma.integrityRecord.aggregate.mockResolvedValue({
        _avg: { steps: 0 },
      });

      const req = makeGetRequest(`${url}?page=-5&limit=999`);
      const res = await integrityAuditGET(req, routeCtx);
      const data = await res.json();

      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(100);
    });
  });

  describe("POST /api/admin/integrity-audit", () => {
    const url = "http://localhost:3000/api/admin/integrity-audit";

    it("관리자 미인증 → 403", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makePostRequest(url);
      const res = await integrityAuditPOST(req, routeCtx);

      expect(res.status).toBe(403);
    });

    it("재검증 성공 → verified/tampered 카운트 반환", async () => {
      const validRecord = {
        id: "rec-1",
        isValid: true,
        stepsData: [
          { stepId: "s1", stepName: "step1", inputHash: "h1", outputHash: "h2", previousStepHash: "", stepHash: "sh1" },
          { stepId: "s2", stepName: "step2", inputHash: "h3", outputHash: "h4", previousStepHash: "sh1", stepHash: "sh2" },
        ],
      };

      mockPrisma.integrityRecord.findMany.mockResolvedValue([validRecord]);
      mockPrisma.integrityRecord.update.mockResolvedValue({});

      const req = makePostRequest(url);
      const res = await integrityAuditPOST(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.checked).toBe(1);
      expect(typeof data.verified).toBe("number");
      expect(typeof data.tampered).toBe("number");
      expect(data.verified + data.tampered).toBe(1);
      expect(data.verifiedAt).toBeDefined();
    });

    it("레코드 0건 시에도 정상 응답", async () => {
      mockPrisma.integrityRecord.findMany.mockResolvedValue([]);

      const req = makePostRequest(url);
      const res = await integrityAuditPOST(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.checked).toBe(0);
      expect(data.verified).toBe(0);
      expect(data.tampered).toBe(0);
    });

    it("변조 감지 시 tampered 카운트 증가 + DB 업데이트", async () => {
      const tamperedRecord = {
        id: "rec-2",
        isValid: true,
        stepsData: [
          { stepId: "s1", stepName: "step1", inputHash: "h1", outputHash: "h2", previousStepHash: "", stepHash: "sh1" },
          { stepId: "s2", stepName: "step2", inputHash: "h3", outputHash: "h4", previousStepHash: "WRONG-HASH", stepHash: "sh2" },
        ],
      };

      mockPrisma.integrityRecord.findMany.mockResolvedValue([tamperedRecord]);
      mockPrisma.integrityRecord.update.mockResolvedValue({});

      const req = makePostRequest(url);
      const res = await integrityAuditPOST(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.tampered).toBe(1);
      // isValid 변경 시 update 호출 확인
      expect(mockPrisma.integrityRecord.update).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // B. /api/admin/guarantee-rules
  // ═══════════════════════════════════════════════════════════

  describe("GET /api/admin/guarantee-rules", () => {
    const url = "http://localhost:3000/api/admin/guarantee-rules";

    it("관리자 미인증 → 403", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makeGetRequest(url);
      const res = await guaranteeRulesGET(req, routeCtx);

      expect(res.status).toBe(403);
    });

    it("정상 조회 → activeRules, history 포함", async () => {
      const activeRule = { id: "r-1", provider: "HUG", isActive: true, version: 2 };
      const historyItem = { id: "r-1", provider: "HUG", version: 2 };

      mockPrisma.guaranteeRule.findMany
        .mockResolvedValueOnce([activeRule])
        .mockResolvedValueOnce([historyItem, { ...historyItem, id: "r-0", version: 1 }]);

      const req = makeGetRequest(url);
      const res = await guaranteeRulesGET(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.activeRules).toHaveLength(1);
      expect(data.history).toHaveLength(2);
    });

    it("규칙 없는 경우 빈 배열 반환", async () => {
      mockPrisma.guaranteeRule.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const req = makeGetRequest(url);
      const res = await guaranteeRulesGET(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.activeRules).toEqual([]);
      expect(data.history).toEqual([]);
    });
  });

  describe("PUT /api/admin/guarantee-rules", () => {
    const url = "http://localhost:3000/api/admin/guarantee-rules";

    it("관리자 미인증 → 403", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makePutRequest(url, { provider: "HUG", rules: {} });
      const res = await guaranteeRulesPUT(req, routeCtx);

      expect(res.status).toBe(403);
    });

    it("provider 누락 → 400", async () => {
      const req = makePutRequest(url, { rules: { max: 100 } });
      const res = await guaranteeRulesPUT(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("필수");
    });

    it("rules 누락 → 400", async () => {
      const req = makePutRequest(url, { provider: "HUG" });
      const res = await guaranteeRulesPUT(req, routeCtx);

      expect(res.status).toBe(400);
    });

    it("유효하지 않은 provider → 400", async () => {
      const req = makePutRequest(url, { provider: "INVALID", rules: {} });
      const res = await guaranteeRulesPUT(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("유효하지 않은 기관");
    });

    it("정상 수정 → 새 버전 생성, 이전 비활성화", async () => {
      const currentRule = { id: "r-1", provider: "HUG", version: 2, isActive: true };
      const newRule = { id: "r-2", provider: "HUG", version: 3, isActive: true };

      mockPrisma.guaranteeRule.findFirst.mockResolvedValue(currentRule);
      // $transaction은 prisma 인스턴스 수준에서 호출됨
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return fn(mockPrisma);
      });
      mockPrisma.guaranteeRule.update.mockResolvedValue({});
      mockPrisma.guaranteeRule.create.mockResolvedValue(newRule);

      const req = makePutRequest(url, {
        provider: "HUG",
        rules: { maxGuarantee: 500000000 },
        changelog: "한도 상향",
      });
      const res = await guaranteeRulesPUT(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rule).toMatchObject({ id: "r-2", version: 3 });
    });

    it("첫 번째 규칙 생성 시 version 1로 시작", async () => {
      mockPrisma.guaranteeRule.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return fn(mockPrisma);
      });
      const newRule = { id: "r-1", provider: "SGI", version: 1, isActive: true };
      mockPrisma.guaranteeRule.create.mockResolvedValue(newRule);

      const req = makePutRequest(url, { provider: "SGI", rules: { maxGuarantee: 100 } });
      const res = await guaranteeRulesPUT(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.rule.version).toBe(1);
      // 이전 규칙이 없으므로 update는 호출되지 않아야 함
      expect(mockPrisma.guaranteeRule.update).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // C. /api/admin/account (비밀번호 변경)
  // ═══════════════════════════════════════════════════════════

  describe("PUT /api/admin/account", () => {
    const url = "http://localhost:3000/api/admin/account";

    it("미인증 → 403", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makePutRequest(url, {
        currentPassword: "old",
        newPassword: "NewPass1!",
      });
      // account route는 withAdminAuth 래퍼를 사용하지 않고 직접 auth() 호출
      const res = await accountPUT(req as unknown as Request);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("관리자 권한");
    });

    it("일반 사용자 → 403", async () => {
      mockAuth.mockResolvedValue(USER_SESSION);

      const req = makePutRequest(url, {
        currentPassword: "old",
        newPassword: "NewPass1!",
      });
      const res = await accountPUT(req as unknown as Request);

      expect(res.status).toBe(403);
    });

    it("필수 입력값 누락 → 400", async () => {
      const req = makePutRequest(url, { currentPassword: "old" });
      const res = await accountPUT(req as unknown as Request);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("필수 입력값");
    });

    it("새 비밀번호 8자 미만 → 400", async () => {
      const req = makePutRequest(url, {
        currentPassword: "old",
        newPassword: "Ab1!",
      });
      const res = await accountPUT(req as unknown as Request);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("8자 이상");
    });

    it("복잡도 미충족(3종 미만) → 400", async () => {
      const req = makePutRequest(url, {
        currentPassword: "old",
        newPassword: "onlylowercase",
      });
      const res = await accountPUT(req as unknown as Request);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("3종 이상");
    });

    it("현재 비밀번호 불일치 → 401", async () => {
      mockBcrypt.compare.mockResolvedValue(false as never);

      mockPrisma.user.findUnique.mockResolvedValue({ password: "hashed-old" });

      const req = makePutRequest(url, {
        currentPassword: "wrongpassword",
        newPassword: "NewPass1!@",
      });
      const res = await accountPUT(req as unknown as Request);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain("현재 비밀번호");
    });

    it("비밀번호 미설정 계정 → 400", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ password: null });

      const req = makePutRequest(url, {
        currentPassword: "anything",
        newPassword: "NewPass1!@",
      });
      const res = await accountPUT(req as unknown as Request);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("비밀번호가 설정되지 않은");
    });

    it("정상 변경 → 200 + 성공 메시지", async () => {
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockBcrypt.hash.mockResolvedValue("new-hash" as never);

      mockPrisma.user.findUnique.mockResolvedValue({ password: "hashed-old" });
      mockPrisma.user.update.mockResolvedValue({});

      const req = makePutRequest(url, {
        currentPassword: "OldPass1!",
        newPassword: "NewPass1!@",
      });
      const res = await accountPUT(req as unknown as Request);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toContain("변경");
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "admin-1" },
        data: { password: "new-hash" },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // D. /api/admin/news
  // ═══════════════════════════════════════════════════════════

  describe("GET /api/admin/news", () => {
    const url = "http://localhost:3000/api/admin/news";

    it("관리자 미인증 → 403", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makeGetRequest(url);
      const res = await newsGET(req, routeCtx);

      expect(res.status).toBe(403);
    });

    it("정상 조회 → items, total, page, totalPages 포함", async () => {
      const mockArticle = {
        id: "news-1",
        title: "전세 시장 동향",
        category: "market",
        publishedAt: new Date(),
        _count: { usageLogs: 42 },
      };

      mockPrisma.newsArticle.findMany.mockResolvedValue([mockArticle]);
      mockPrisma.newsArticle.count.mockResolvedValue(1);

      const req = makeGetRequest(url);
      const res = await newsGET(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].usageCount).toBe(42);
      expect(data.total).toBe(1);
      expect(data.page).toBe(1);
      expect(data.totalPages).toBe(1);
    });

    it("필터 파라미터 적용 — category, tag, search", async () => {
      mockPrisma.newsArticle.findMany.mockResolvedValue([]);
      mockPrisma.newsArticle.count.mockResolvedValue(0);

      const req = makeGetRequest(`${url}?category=policy&tag=jeonse&search=전세`);
      const res = await newsGET(req, routeCtx);

      expect(res.status).toBe(200);
      expect(mockPrisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: "policy",
            tags: { has: "jeonse" },
            title: { contains: "전세", mode: "insensitive" },
          }),
        })
      );
    });

    it("pagination 경계값 — limit 상한 50", async () => {
      mockPrisma.newsArticle.findMany.mockResolvedValue([]);
      mockPrisma.newsArticle.count.mockResolvedValue(0);

      const req = makeGetRequest(`${url}?page=1&limit=200`);
      const res = await newsGET(req, routeCtx);
      const data = await res.json();

      expect(data.page).toBe(1);
      // limit은 50으로 clamped
      expect(mockPrisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });
  });

  describe("DELETE /api/admin/news", () => {
    const url = "http://localhost:3000/api/admin/news";

    it("관리자 미인증 → 403", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makeDeleteRequest(url, { id: "news-1" });
      const res = await newsDELETE(req, routeCtx);

      expect(res.status).toBe(403);
    });

    it("ID 누락 → 400", async () => {
      const req = makeDeleteRequest(url, {});
      const res = await newsDELETE(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("ID");
    });

    it("정상 삭제 → success: true", async () => {
      mockPrisma.newsArticle.delete.mockResolvedValue({});

      const req = makeDeleteRequest(url, { id: "news-1" });
      const res = await newsDELETE(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.newsArticle.delete).toHaveBeenCalledWith({
        where: { id: "news-1" },
      });
    });

    it("존재하지 않는 기사 삭제 → 404", async () => {
      mockPrisma.newsArticle.delete.mockRejectedValue(new Error("Not found"));

      const req = makeDeleteRequest(url, { id: "non-existent" });
      const res = await newsDELETE(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain("삭제 실패");
    });
  });

  // ═══════════════════════════════════════════════════════════
  // E. /api/admin/loan-rates
  // ═══════════════════════════════════════════════════════════

  describe("GET /api/admin/loan-rates", () => {
    it("관리자 미인증 → 403", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makeGetRequest("http://localhost:3000/api/admin/loan-rates");
      const res = await loanRatesGET();

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("관리자 권한");
    });

    it("캐시 데이터 있을 때 → rates + hasCachedData: true", async () => {
      const cachedData = [
        { bankName: "KB국민", productName: "전세론", rateMin: 3.5, rateMax: 4.2 },
      ];
      mockGetCachedRates.mockResolvedValue(cachedData);

      const res = await loanRatesGET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.rates).toEqual(cachedData);
      expect(data.hasCachedData).toBe(true);
    });

    it("캐시 없을 때 → hasCachedData: false", async () => {
      mockGetCachedRates.mockResolvedValue(null);

      const res = await loanRatesGET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.rates).toBeNull();
      expect(data.hasCachedData).toBe(false);
    });
  });

  describe("POST /api/admin/loan-rates", () => {
    const url = "http://localhost:3000/api/admin/loan-rates";

    it("관리자 미인증 → 403", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makePostRequest(url);
      const res = await loanRatesPOST(req);

      expect(res.status).toBe(403);
    });

    it("FSS 갱신 성공 → 상품 목록 반환", async () => {
      const fssResult = {
        dataSource: "fss" as const,
        products: [
          { bankName: "신한", productName: "전세론", rateMin: 3.2, rateMax: 3.8 },
          { bankName: "하나", productName: "전세론", rateMin: 3.3, rateMax: 4.0 },
        ],
        fetchedAt: "2026-05-26T12:00:00Z",
      };
      mockFetchFSSLoanRates.mockResolvedValue(fssResult);

      const req = makePostRequest(url);
      const res = await loanRatesPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.productCount).toBe(2);
      expect(data.products).toHaveLength(2);
    });

    it("FSS fallback → success: false", async () => {
      const fallbackResult = {
        dataSource: "fallback" as const,
        products: [],
        fetchedAt: "2026-05-26T12:00:00Z",
      };
      mockFetchFSSLoanRates.mockResolvedValue(fallbackResult);

      const req = makePostRequest(url);
      const res = await loanRatesPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // F. /api/admin/analyses
  // ═══════════════════════════════════════════════════════════

  describe("GET /api/admin/analyses", () => {
    const url = "http://localhost:3000/api/admin/analyses";

    it("관리자 미인증 → 403", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makeGetRequest(url);
      const res = await analysesGET(req, routeCtx);

      expect(res.status).toBe(403);
    });

    it("정상 조회 → 분석 목록 반환", async () => {
      const mockAnalysis = {
        id: "an-1",
        type: "jeonse",
        typeLabel: "전세 안전성 분석",
        address: "서울시 강남구",
        summary: "안전 등급 A",
        createdAt: new Date(),
        user: { name: "홍길동", email: "hong@test.com" },
      };

      mockPrisma.analysis.findMany.mockResolvedValue([mockAnalysis]);

      const req = makeGetRequest(url);
      const res = await analysesGET(req, routeCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe("an-1");
      expect(data[0].user.name).toBe("홍길동");
    });

    it("type 필터 적용", async () => {
      mockPrisma.analysis.findMany.mockResolvedValue([]);

      const req = makeGetRequest(`${url}?type=rights`);
      const res = await analysesGET(req, routeCtx);

      expect(res.status).toBe(200);
      expect(mockPrisma.analysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: "rights" },
        })
      );
    });

    it("type 필터 없으면 전체 조회", async () => {
      mockPrisma.analysis.findMany.mockResolvedValue([]);

      const req = makeGetRequest(url);
      const res = await analysesGET(req, routeCtx);

      expect(res.status).toBe(200);
      expect(mockPrisma.analysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it("최대 200건 제한", async () => {
      mockPrisma.analysis.findMany.mockResolvedValue([]);

      const req = makeGetRequest(url);
      await analysesGET(req, routeCtx);

      expect(mockPrisma.analysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 })
      );
    });
  });
});
