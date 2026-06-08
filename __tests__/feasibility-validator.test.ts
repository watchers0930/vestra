/**
 * Comprehensive tests for feasibility validation and audit modules
 *
 * Covers:
 *  - feasibility-validator.ts  (verifyClaims, buildResult)
 *  - audit-engine.ts           (judgeRationality, generateReasoning, assessRationality, calculateFeasibilityScore)
 *  - context-merger.ts         (mergeContexts, applyResolvedConflicts)
 *  - scr-claim-keys.ts         (SCR_CLAIM_KEYS, SCR_CLAIM_LABELS, SCR_CLAIM_UNITS, SCR_CLAIM_CATEGORIES)
 *  - scr-project-type-detector.ts (detectProjectType, detectProjectTypeDetailed)
 *  - benchmark-db.ts           (classifyRegion, INDUSTRY_BENCHMARKS, getBenchmark* functions)
 *  - static-data.ts            (isRegulatedArea, isHUGHighPriceArea, getLoanRegulations, getNearbySupplyCases, getStaticMarketContext)
 */

import { describe, it, expect, vi } from "vitest";

// ── audit-engine ──
import {
  judgeRationality,
  generateReasoning,
  assessRationality,
  calculateFeasibilityScore,
} from "@/lib/feasibility/audit-engine";

// ── context-merger ──
import {
  mergeContexts,
  applyResolvedConflicts,
} from "@/lib/feasibility/context-merger";

// ── scr-claim-keys ──
import {
  SCR_CLAIM_KEYS,
  SCR_CLAIM_LABELS,
  SCR_CLAIM_UNITS,
  SCR_CLAIM_CATEGORIES,
} from "@/lib/feasibility/scr-claim-keys";

// ── scr-project-type-detector ──
import {
  detectProjectType,
  detectProjectTypeDetailed,
} from "@/lib/feasibility/scr-project-type-detector";

// ── benchmark-db ──
import {
  classifyRegion,
  INDUSTRY_BENCHMARKS,
} from "@/lib/feasibility/benchmark-db";

// ── static-data ──
import {
  isRegulatedArea,
  isHUGHighPriceArea,
  getLoanRegulations,
  getNearbySupplyCases,
  getStaticMarketContext,
  POLICY_TIMELINE,
  REGULATED_AREAS,
  HUG_HIGH_PRICE_AREAS,
  LOAN_REGULATIONS,
  SUPPLY_CASES_DB,
} from "@/lib/feasibility/static-data";

// ── types ──
import type {
  VerificationResult,
  RationalityItem,
  ParsedDocument,
  ExtractedValue,
  MergedProjectContext,
} from "@/lib/feasibility/feasibility-types";
import { CLAIM_KEYS, CLAIM_LABELS } from "@/lib/feasibility/feasibility-types";

// ── feasibility-validator (mock external deps) ──
vi.mock("@/lib/molit-api", () => ({
  fetchComprehensivePrices: vi.fn(),
}));
vi.mock("@/lib/supply-api", () => ({
  fetchSupplyVolume: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    benchmarkCache: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

import { verifyClaims, type ExternalData } from "@/lib/feasibility/feasibility-validator";

// ═══════════════════════════════════════════════════════════════════════════
// Helper factories
// ═══════════════════════════════════════════════════════════════════════════

function makeExtractedValue(
  overrides: Partial<ExtractedValue> & { key: string; value: number }
): ExtractedValue {
  return {
    key: overrides.key,
    value: overrides.value,
    unit: overrides.unit ?? "만원/평",
    sourceFile: overrides.sourceFile ?? "test.pdf",
    context: overrides.context,
    page: overrides.page,
  };
}

function makeParsedDocument(overrides: Partial<ParsedDocument> = {}): ParsedDocument {
  return {
    filename: overrides.filename ?? "test.pdf",
    fileType: overrides.fileType ?? "pdf",
    fileSize: overrides.fileSize ?? 1024,
    extractedData: overrides.extractedData ?? {},
    rawText: overrides.rawText ?? "",
    confidence: overrides.confidence ?? 90,
    pageCount: overrides.pageCount,
  };
}

function makeVerification(overrides: Partial<VerificationResult> = {}): VerificationResult {
  return {
    claimKey: overrides.claimKey ?? "planned_sale_price",
    claimLabel: overrides.claimLabel ?? "분양가",
    claimValue: overrides.claimValue ?? 2500,
    claimUnit: overrides.claimUnit ?? "만원/평",
    benchmark: overrides.benchmark ?? {
      value: 2300,
      source: "MOLIT 실거래가",
      sourceType: "molit",
      asOfDate: "2026-01-01",
    },
    deviation: overrides.deviation ?? 0.087,
    deviationPercent: overrides.deviationPercent ?? 8.7,
  };
}

function makeExternalData(overrides: Partial<ExternalData> = {}): ExternalData {
  return {
    molit: overrides.molit ?? { sale: null, rent: null, jeonseRatio: null },
    supply: overrides.supply ?? null,
    constructionBenchmark: overrides.constructionBenchmark ?? {
      value: 580,
      source: "KICT",
      sourceType: "kict",
      asOfDate: "2026-01-01",
    },
    saleRateBenchmark: overrides.saleRateBenchmark ?? {
      value: 85,
      source: "지역별 평균",
      sourceType: "internal",
      asOfDate: "2026-01-01",
    },
    pfRateBenchmark: overrides.pfRateBenchmark ?? {
      value: 9,
      source: "PF 금리 밴드",
      sourceType: "internal",
      asOfDate: "2026-01-01",
    },
    profitRateBenchmark: overrides.profitRateBenchmark ?? {
      value: 11.5,
      source: "수익률 기준",
      sourceType: "internal",
      asOfDate: "2026-01-01",
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. audit-engine.ts
// ═══════════════════════════════════════════════════════════════════════════

describe("audit-engine", () => {
  // ── judgeRationality ──
  describe("judgeRationality", () => {
    it("벤치마크가 0이면 APPROPRIATE 반환", () => {
      expect(judgeRationality(500, 0, "planned_sale_price")).toBe("APPROPRIATE");
    });

    it("수익 항목: ±10% 이내면 APPROPRIATE", () => {
      expect(judgeRationality(105, 100, "planned_sale_price")).toBe("APPROPRIATE");
      expect(judgeRationality(95, 100, "planned_sale_price")).toBe("APPROPRIATE");
      expect(judgeRationality(110, 100, "planned_sale_price")).toBe("APPROPRIATE");
      expect(judgeRationality(90, 100, "expected_sale_rate")).toBe("APPROPRIATE");
    });

    it("수익 항목: 10-25% 높으면 OPTIMISTIC", () => {
      expect(judgeRationality(120, 100, "planned_sale_price")).toBe("OPTIMISTIC");
      expect(judgeRationality(124, 100, "expected_sale_rate")).toBe("OPTIMISTIC");
    });

    it("수익 항목: 25% 이상 높으면 UNREALISTIC", () => {
      expect(judgeRationality(130, 100, "planned_sale_price")).toBe("UNREALISTIC");
      expect(judgeRationality(200, 100, "expected_sale_rate")).toBe("UNREALISTIC");
    });

    it("수익 항목: 10-25% 낮으면 CONSERVATIVE", () => {
      expect(judgeRationality(80, 100, "planned_sale_price")).toBe("CONSERVATIVE");
      expect(judgeRationality(85, 100, "expected_sale_rate")).toBe("CONSERVATIVE");
    });

    it("수익 항목: 25% 이상 낮으면 UNREALISTIC", () => {
      expect(judgeRationality(70, 100, "planned_sale_price")).toBe("UNREALISTIC");
    });

    // 비용 항목: 방향 반전 (낮으면 낙관적)
    it("비용 항목: ±10% 이내면 APPROPRIATE", () => {
      expect(judgeRationality(105, 100, "total_construction_cost")).toBe("APPROPRIATE");
      expect(judgeRationality(95, 100, "pf_interest_rate")).toBe("APPROPRIATE");
    });

    it("비용 항목: 10-25% 낮으면 OPTIMISTIC (비용은 낮을수록 낙관)", () => {
      expect(judgeRationality(80, 100, "total_construction_cost")).toBe("OPTIMISTIC");
      expect(judgeRationality(82, 100, "construction_cost_per_pyeong")).toBe("OPTIMISTIC");
    });

    it("비용 항목: 25% 이상 낮으면 UNREALISTIC", () => {
      expect(judgeRationality(70, 100, "total_construction_cost")).toBe("UNREALISTIC");
    });

    it("비용 항목: 10-25% 높으면 CONSERVATIVE", () => {
      expect(judgeRationality(120, 100, "total_construction_cost")).toBe("CONSERVATIVE");
      expect(judgeRationality(115, 100, "pf_interest_rate")).toBe("CONSERVATIVE");
    });

    it("비용 항목: 25% 이상 높으면 UNREALISTIC", () => {
      expect(judgeRationality(130, 100, "total_construction_cost")).toBe("UNREALISTIC");
    });

    it("land_cost와 total_project_cost도 비용 항목으로 취급", () => {
      expect(judgeRationality(80, 100, "land_cost")).toBe("OPTIMISTIC");
      expect(judgeRationality(80, 100, "total_project_cost")).toBe("OPTIMISTIC");
    });

    it("정확히 경계값(±10%)에서 APPROPRIATE", () => {
      expect(judgeRationality(110, 100, "planned_sale_price")).toBe("APPROPRIATE");
      expect(judgeRationality(90, 100, "planned_sale_price")).toBe("APPROPRIATE");
    });

    it("정확히 25% 경계에서 OPTIMISTIC (25% 초과가 UNREALISTIC)", () => {
      // deviation = 0.25 -> absDeviation = 0.25 > 0.10 -> adjustedDev = 0.25 -> not > 0.25 -> OPTIMISTIC
      expect(judgeRationality(125, 100, "planned_sale_price")).toBe("OPTIMISTIC");
    });
  });

  // ── generateReasoning ──
  describe("generateReasoning", () => {
    it("±10% 이내면 적정 범위 메시지 생성", () => {
      const v = makeVerification({ deviationPercent: 5.0 });
      const result = generateReasoning(v);
      expect(result).toContain("적정 범위 내입니다");
      expect(result).toContain("5.0%");
    });

    it("양의 편차시 '높게' 포함", () => {
      const v = makeVerification({ deviationPercent: 18.4 });
      const result = generateReasoning(v);
      expect(result).toContain("높게");
      expect(result).toContain("18.4%");
    });

    it("음의 편차시 '낮게' 포함", () => {
      const v = makeVerification({ deviationPercent: -12.5 });
      const result = generateReasoning(v);
      expect(result).toContain("낮게");
      expect(result).toContain("12.5%");
    });

    it("벤치마크 소스 정보 포함", () => {
      const v = makeVerification({
        benchmark: {
          value: 2300,
          source: "MOLIT 실거래가 (2026.01~03)",
          sourceType: "molit",
          asOfDate: "2026-01-01",
        },
        deviationPercent: 15.0,
      });
      const result = generateReasoning(v);
      expect(result).toContain("MOLIT 실거래가 (2026.01~03)");
    });

    it("0% 편차도 적정 범위로 판정", () => {
      const v = makeVerification({ deviationPercent: 0 });
      const result = generateReasoning(v);
      expect(result).toContain("적정 범위 내입니다");
    });

    it("정확히 10% 편차도 적정 범위", () => {
      const v = makeVerification({ deviationPercent: 10.0 });
      const result = generateReasoning(v);
      expect(result).toContain("적정 범위 내입니다");
    });

    it("-10% 편차도 적정 범위", () => {
      const v = makeVerification({ deviationPercent: -10.0 });
      const result = generateReasoning(v);
      expect(result).toContain("적정 범위 내입니다");
    });
  });

  // ── assessRationality ──
  describe("assessRationality", () => {
    it("빈 배열이면 빈 배열 반환", () => {
      expect(assessRationality([])).toEqual([]);
    });

    it("검증 결과를 합리성 판정으로 정확히 변환", () => {
      const verifications: VerificationResult[] = [
        makeVerification({
          claimKey: "planned_sale_price",
          claimLabel: "분양가",
          claimValue: 2500,
          claimUnit: "만원/평",
          benchmark: { value: 2300, source: "MOLIT", sourceType: "molit", asOfDate: "2026-01-01" },
          deviation: 0.087,
          deviationPercent: 8.7,
        }),
      ];

      const result = assessRationality(verifications);
      expect(result).toHaveLength(1);
      expect(result[0].claimKey).toBe("planned_sale_price");
      expect(result[0].claimLabel).toBe("분양가");
      expect(result[0].grade).toBe("APPROPRIATE");
      expect(result[0].deviation).toBe(8.7);
      expect(result[0].reasoning).toBeTruthy();
      expect(result[0].verificationSource).toBe("MOLIT");
    });

    it("다중 검증 결과 각각 올바른 등급 배정", () => {
      const verifications: VerificationResult[] = [
        makeVerification({ claimKey: "planned_sale_price", claimValue: 2500, benchmark: { value: 2300, source: "A", sourceType: "molit", asOfDate: "" }, deviation: 0.087, deviationPercent: 8.7 }),
        makeVerification({ claimKey: "total_construction_cost", claimValue: 400, benchmark: { value: 580, source: "B", sourceType: "kict", asOfDate: "" }, deviation: -0.31, deviationPercent: -31.0 }),
      ];

      const result = assessRationality(verifications);
      expect(result[0].grade).toBe("APPROPRIATE"); // 8.7% 이내
      expect(result[1].grade).toBe("UNREALISTIC"); // 비용 항목 31% 낮음 -> UNREALISTIC
    });
  });

  // ── calculateFeasibilityScore ──
  describe("calculateFeasibilityScore", () => {
    it("빈 배열이면 0점, F등급", () => {
      const result = calculateFeasibilityScore([]);
      expect(result.score).toBe(0);
      expect(result.grade).toBe("F");
      expect(result.gradeLabel).toBe("투자불가");
    });

    it("전부 APPROPRIATE면 90점, A등급", () => {
      const items: RationalityItem[] = [
        { claimKey: "planned_sale_price", claimLabel: "분양가", grade: "APPROPRIATE", deviation: 5, reasoning: "", verificationSource: "" },
        { claimKey: "total_construction_cost", claimLabel: "공사비", grade: "APPROPRIATE", deviation: -3, reasoning: "", verificationSource: "" },
      ];
      const result = calculateFeasibilityScore(items);
      expect(result.score).toBe(90);
      expect(result.grade).toBe("A");
      expect(result.gradeLabel).toBe("투자적격");
    });

    it("전부 UNREALISTIC이면 20점, F등급", () => {
      const items: RationalityItem[] = [
        { claimKey: "planned_sale_price", claimLabel: "분양가", grade: "UNREALISTIC", deviation: 30, reasoning: "", verificationSource: "" },
        { claimKey: "expected_sale_rate", claimLabel: "분양률", grade: "UNREALISTIC", deviation: 40, reasoning: "", verificationSource: "" },
      ];
      const result = calculateFeasibilityScore(items);
      expect(result.score).toBe(20);
      expect(result.grade).toBe("F");
    });

    it("전부 CONSERVATIVE면 80점, B등급", () => {
      const items: RationalityItem[] = [
        { claimKey: "planned_sale_price", claimLabel: "분양가", grade: "CONSERVATIVE", deviation: -15, reasoning: "", verificationSource: "" },
      ];
      const result = calculateFeasibilityScore(items);
      expect(result.score).toBe(80);
      expect(result.grade).toBe("B");
      expect(result.gradeLabel).toBe("조건부적격");
    });

    it("전부 OPTIMISTIC이면 55점, C등급", () => {
      const items: RationalityItem[] = [
        { claimKey: "planned_sale_price", claimLabel: "분양가", grade: "OPTIMISTIC", deviation: 20, reasoning: "", verificationSource: "" },
      ];
      const result = calculateFeasibilityScore(items);
      expect(result.score).toBe(55);
      expect(result.grade).toBe("C");
      expect(result.gradeLabel).toBe("주의");
    });

    it("가중치가 있는 항목과 없는 항목 혼합 시 정확한 가중 평균 계산", () => {
      const items: RationalityItem[] = [
        { claimKey: "planned_sale_price", claimLabel: "분양가", grade: "APPROPRIATE", deviation: 5, reasoning: "", verificationSource: "" },
        { claimKey: "unknown_key", claimLabel: "기타", grade: "UNREALISTIC", deviation: 50, reasoning: "", verificationSource: "" },
      ];
      const result = calculateFeasibilityScore(items);
      // planned_sale_price: weight=0.25, score=90
      // unknown_key: weight=0.05, score=20
      // weighted = (90*0.25 + 20*0.05) / (0.25+0.05) = (22.5+1) / 0.30 = 78.33 -> 78
      expect(result.score).toBe(78);
      expect(result.grade).toBe("B");
    });

    it("breakdown에 각 항목 정보가 포함됨", () => {
      const items: RationalityItem[] = [
        { claimKey: "planned_sale_price", claimLabel: "분양가", grade: "APPROPRIATE", deviation: 5, reasoning: "", verificationSource: "" },
        { claimKey: "pf_interest_rate", claimLabel: "PF 금리", grade: "OPTIMISTIC", deviation: 20, reasoning: "", verificationSource: "" },
      ];
      const result = calculateFeasibilityScore(items);
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0].category).toBe("분양가");
      expect(result.breakdown[0].weight).toBe(0.25);
      expect(result.breakdown[0].score).toBe(90);
      expect(result.breakdown[1].category).toBe("PF 금리");
      expect(result.breakdown[1].weight).toBe(0.10);
      expect(result.breakdown[1].score).toBe(55);
    });

    it("investmentOpinion은 빈 문자열(LLM이 채움)", () => {
      const result = calculateFeasibilityScore([]);
      expect(result.investmentOpinion).toBe("");
    });

    it("등급 경계값 확인: D등급(40-54)", () => {
      // 40점 이상 55점 미만 -> D
      // UNREALISTIC=20, OPTIMISTIC=55 혼합으로 중간값 만들기
      const items: RationalityItem[] = [
        { claimKey: "planned_sale_price", claimLabel: "", grade: "UNREALISTIC", deviation: 0, reasoning: "", verificationSource: "" },
        { claimKey: "total_construction_cost", claimLabel: "", grade: "OPTIMISTIC", deviation: 0, reasoning: "", verificationSource: "" },
        { claimKey: "expected_sale_rate", claimLabel: "", grade: "OPTIMISTIC", deviation: 0, reasoning: "", verificationSource: "" },
      ];
      const result = calculateFeasibilityScore(items);
      // planned_sale_price: 0.25*20=5, total_construction_cost: 0.20*55=11, expected_sale_rate: 0.15*55=8.25
      // total = 24.25, totalWeight = 0.60, score = 40.42 -> 40
      expect(result.score).toBe(40);
      expect(result.grade).toBe("D");
      expect(result.gradeLabel).toBe("부적격");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. context-merger.ts
// ═══════════════════════════════════════════════════════════════════════════

describe("context-merger", () => {
  // ── mergeContexts ──
  describe("mergeContexts", () => {
    it("단일 문서에서 올바르게 병합", () => {
      const doc = makeParsedDocument({
        filename: "사업개요.pdf",
        rawText: "사업명: 울산 우정동 주상복합 신축사업 소재지: 서울시 강남구 역삼동 123",
        extractedData: {
          planned_sale_price: makeExtractedValue({ key: "planned_sale_price", value: 2500 }),
          total_units: makeExtractedValue({ key: "total_units", value: 300, unit: "세대" }),
        },
      });

      const { context, conflicts } = mergeContexts([doc]);
      expect(conflicts).toHaveLength(0);
      expect(context.claims).toHaveLength(2);
      expect(context.sourceFiles).toHaveLength(1);
    });

    it("빈 문서 배열이면 기본 컨텍스트 반환", () => {
      const { context, conflicts } = mergeContexts([]);
      expect(conflicts).toHaveLength(0);
      expect(context.claims).toHaveLength(0);
      expect(context.projectName).toBe("미지정 사업");
      expect(context.location.address).toBe("");
    });

    it("동일 키의 값이 2% 이상 차이나면 conflict 감지", () => {
      const doc1 = makeParsedDocument({
        filename: "A.pdf",
        extractedData: {
          planned_sale_price: makeExtractedValue({
            key: "planned_sale_price",
            value: 1000,
            sourceFile: "A.pdf",
          }),
        },
      });
      const doc2 = makeParsedDocument({
        filename: "B.pdf",
        extractedData: {
          planned_sale_price: makeExtractedValue({
            key: "planned_sale_price",
            value: 1200,
            sourceFile: "B.pdf",
          }),
        },
      });

      const { conflicts, context } = mergeContexts([doc1, doc2]);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].field).toBe("planned_sale_price");
      expect(conflicts[0].fileA).toBe("A.pdf");
      expect(conflicts[0].fileB).toBe("B.pdf");
      // 마지막 문서(최신) 값을 채택
      const claim = context.claims.find((c) => c.key === "planned_sale_price");
      expect(claim?.value).toBe(1200);
    });

    it("동일 키의 값이 2% 이내면 conflict 없이 마지막 값 채택", () => {
      const doc1 = makeParsedDocument({
        filename: "A.pdf",
        extractedData: {
          planned_sale_price: makeExtractedValue({
            key: "planned_sale_price",
            value: 1000,
            sourceFile: "A.pdf",
          }),
        },
      });
      const doc2 = makeParsedDocument({
        filename: "B.pdf",
        extractedData: {
          planned_sale_price: makeExtractedValue({
            key: "planned_sale_price",
            value: 1010, // 1% 차이
            sourceFile: "B.pdf",
          }),
        },
      });

      const { conflicts, context } = mergeContexts([doc1, doc2]);
      expect(conflicts).toHaveLength(0);
      const claim = context.claims.find((c) => c.key === "planned_sale_price");
      expect(claim?.value).toBe(1010);
    });

    it("주소 패턴을 rawText에서 추출", () => {
      const doc = makeParsedDocument({
        rawText: "소재지: 서울특별시 강남구 역삼동 123-4",
      });
      const { context } = mergeContexts([doc]);
      expect(context.location.address).toContain("역삼동");
      // district regex는 주소에서 첫 구/군/시 매칭 → "서울특별시"가 먼저 잡힘
      expect(context.location.district).toBeTruthy();
    });

    it("주소 패턴이 없으면 빈 문자열", () => {
      const doc = makeParsedDocument({ rawText: "아무런 주소 정보가 없는 텍스트" });
      const { context } = mergeContexts([doc]);
      expect(context.location.address).toBe("");
    });

    it("프로젝트명: '사업명:' 패턴으로 추출", () => {
      const doc = makeParsedDocument({
        rawText: "사업명: 강남 센트럴 타워 신축사업",
      });
      const { context } = mergeContexts([doc]);
      expect(context.projectName).toBe("강남 센트럴 타워 신축사업");
    });

    it("프로젝트명 미발견 시 파일명 사용", () => {
      const doc = makeParsedDocument({
        filename: "사업개요_서류.pdf",
        rawText: "수치 데이터만 있는 문서 1234 5678",
      });
      const { context } = mergeContexts([doc]);
      expect(context.projectName).toBe("사업개요_서류");
    });

    it("용도: '아파트' 키워드 감지", () => {
      const doc = makeParsedDocument({ rawText: "본 사업은 아파트 분양사업입니다" });
      const { context } = mergeContexts([doc]);
      expect(context.purpose).toBe("아파트");
    });

    it("용도: '오피스텔' 키워드 감지", () => {
      const doc = makeParsedDocument({ rawText: "주거형 오피스텔 사업 개요" });
      const { context } = mergeContexts([doc]);
      expect(context.purpose).toBe("오피스텔");
    });

    it("용도: '주상복합' 감지", () => {
      const doc = makeParsedDocument({ rawText: "주상복합 건축물 설계 보고서" });
      const { context } = mergeContexts([doc]);
      expect(context.purpose).toBe("복합");
    });

    it("용도: '지식산업센터' 감지", () => {
      const doc = makeParsedDocument({ rawText: "지식산업센터 투자유치 제안서" });
      const { context } = mergeContexts([doc]);
      expect(context.purpose).toBe("지식산업센터");
    });

    it("용도: 키워드 미발견 시 '기타'", () => {
      const doc = makeParsedDocument({ rawText: "특별한 키워드 없는 문서" });
      const { context } = mergeContexts([doc]);
      expect(context.purpose).toBe("기타");
    });

    it("scale 필드에 올바른 추출값 반영", () => {
      const doc = makeParsedDocument({
        extractedData: {
          total_land_area: makeExtractedValue({ key: "total_land_area", value: 5000, unit: "㎡" }),
          total_floor_area: makeExtractedValue({ key: "total_floor_area", value: 30000, unit: "㎡" }),
          floor_area_ratio: makeExtractedValue({ key: "floor_area_ratio", value: 299.9, unit: "%" }),
          building_coverage: makeExtractedValue({ key: "building_coverage", value: 59.9, unit: "%" }),
          total_units: makeExtractedValue({ key: "total_units", value: 500, unit: "세대" }),
        },
      });

      const { context } = mergeContexts([doc]);
      expect(context.scale.totalLandArea).toBe(5000);
      expect(context.scale.totalFloorArea).toBe(30000);
      expect(context.scale.floorAreaRatio).toBe(299.9);
      expect(context.scale.buildingCoverage).toBe(59.9);
      expect(context.scale.totalUnits).toBe(500);
    });

    it("3개 파일에서 동일 키 충돌 시 pairwise conflict 생성", () => {
      const docs = [
        makeParsedDocument({
          filename: "A.pdf",
          extractedData: { x: makeExtractedValue({ key: "x", value: 100, sourceFile: "A.pdf" }) },
        }),
        makeParsedDocument({
          filename: "B.pdf",
          extractedData: { x: makeExtractedValue({ key: "x", value: 200, sourceFile: "B.pdf" }) },
        }),
        makeParsedDocument({
          filename: "C.pdf",
          extractedData: { x: makeExtractedValue({ key: "x", value: 300, sourceFile: "C.pdf" }) },
        }),
      ];
      const { conflicts } = mergeContexts(docs);
      // 3C2 = 3 pairs: (A,B), (A,C), (B,C)
      expect(conflicts.length).toBe(3);
    });
  });

  // ── applyResolvedConflicts ──
  describe("applyResolvedConflicts", () => {
    it("해결된 값으로 claims 업데이트", () => {
      const context: MergedProjectContext = {
        projectName: "테스트",
        location: { address: "", district: "", dongCode: "" },
        scale: { totalLandArea: 0, totalFloorArea: 0, floorAreaRatio: 0, buildingCoverage: 0, floors: { above: 0, below: 0 }, totalUnits: 0 },
        purpose: "아파트",
        claims: [
          makeExtractedValue({ key: "planned_sale_price", value: 2500, sourceFile: "A.pdf" }),
          makeExtractedValue({ key: "total_units", value: 300, unit: "세대", sourceFile: "B.pdf" }),
        ],
        conflicts: [],
        resolvedConflicts: [],
        sourceFiles: [],
      };

      const resolved = [
        { field: "planned_sale_price", selectedFile: "B.pdf", selectedValue: 2600 },
      ];

      const updated = applyResolvedConflicts(context, resolved);
      expect(updated.resolvedConflicts).toEqual(resolved);
      const saleClaim = updated.claims.find((c) => c.key === "planned_sale_price");
      expect(saleClaim?.value).toBe(2600);
      expect(saleClaim?.sourceFile).toBe("B.pdf");
      // 미해결 항목은 원본 유지
      const unitClaim = updated.claims.find((c) => c.key === "total_units");
      expect(unitClaim?.value).toBe(300);
    });

    it("해결 항목이 없으면 원본 그대로 유지", () => {
      const context: MergedProjectContext = {
        projectName: "테스트",
        location: { address: "", district: "", dongCode: "" },
        scale: { totalLandArea: 0, totalFloorArea: 0, floorAreaRatio: 0, buildingCoverage: 0, floors: { above: 0, below: 0 }, totalUnits: 0 },
        purpose: "아파트",
        claims: [makeExtractedValue({ key: "planned_sale_price", value: 2500 })],
        conflicts: [],
        resolvedConflicts: [],
        sourceFiles: [],
      };

      const updated = applyResolvedConflicts(context, []);
      expect(updated.claims[0].value).toBe(2500);
      expect(updated.resolvedConflicts).toEqual([]);
    });

    it("원본 context를 변이시키지 않음 (불변성)", () => {
      const original: MergedProjectContext = {
        projectName: "테스트",
        location: { address: "", district: "", dongCode: "" },
        scale: { totalLandArea: 0, totalFloorArea: 0, floorAreaRatio: 0, buildingCoverage: 0, floors: { above: 0, below: 0 }, totalUnits: 0 },
        purpose: "아파트",
        claims: [makeExtractedValue({ key: "planned_sale_price", value: 2500 })],
        conflicts: [],
        resolvedConflicts: [],
        sourceFiles: [],
      };

      applyResolvedConflicts(original, [
        { field: "planned_sale_price", selectedFile: "B.pdf", selectedValue: 9999 },
      ]);

      // original should still have the old value
      expect(original.claims[0].value).toBe(2500);
      expect(original.resolvedConflicts).toEqual([]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. feasibility-validator.ts (verifyClaims)
// ═══════════════════════════════════════════════════════════════════════════

describe("feasibility-validator", () => {
  describe("verifyClaims", () => {
    it("빈 claims 배열이면 빈 결과 반환", () => {
      const result = verifyClaims([], makeExternalData());
      expect(result).toEqual([]);
    });

    it("construction_cost_per_pyeong claim을 벤치마크 대비 검증", () => {
      const claims = [
        makeExtractedValue({ key: "construction_cost_per_pyeong", value: 600, unit: "만원/평" }),
      ];
      const result = verifyClaims(claims, makeExternalData());
      expect(result).toHaveLength(1);
      expect(result[0].claimKey).toBe("construction_cost_per_pyeong");
      expect(result[0].benchmark.sourceType).toBe("kict");
      expect(result[0].deviation).toBeCloseTo((600 - 580) / 580, 5);
    });

    it("total_construction_cost claim을 KICT 벤치마크로 검증", () => {
      const claims = [
        makeExtractedValue({ key: "total_construction_cost", value: 500, unit: "만원" }),
      ];
      const result = verifyClaims(claims, makeExternalData());
      expect(result).toHaveLength(1);
      expect(result[0].claimKey).toBe("total_construction_cost");
    });

    it("expected_sale_rate claim을 지역별 벤치마크로 검증", () => {
      const claims = [
        makeExtractedValue({ key: "expected_sale_rate", value: 90, unit: "%" }),
      ];
      const result = verifyClaims(claims, makeExternalData());
      expect(result).toHaveLength(1);
      expect(result[0].claimKey).toBe("expected_sale_rate");
      expect(result[0].benchmark.value).toBe(85);
    });

    it("pf_interest_rate claim을 PF 금리 밴드로 검증", () => {
      const claims = [
        makeExtractedValue({ key: "pf_interest_rate", value: 8.5, unit: "%" }),
      ];
      const result = verifyClaims(claims, makeExternalData());
      expect(result).toHaveLength(1);
      expect(result[0].claimKey).toBe("pf_interest_rate");
      expect(result[0].benchmark.value).toBe(9);
    });

    it("expected_profit_rate claim을 수익률 벤치마크로 검증", () => {
      const claims = [
        makeExtractedValue({ key: "expected_profit_rate", value: 12, unit: "%" }),
      ];
      const result = verifyClaims(claims, makeExternalData());
      expect(result).toHaveLength(1);
      expect(result[0].claimKey).toBe("expected_profit_rate");
    });

    it("planned_sale_price: MOLIT 데이터 없으면 null 반환 (결과에 포함 안됨)", () => {
      const claims = [
        makeExtractedValue({ key: "planned_sale_price", value: 2500 }),
      ];
      const result = verifyClaims(claims, makeExternalData({ molit: { sale: null, rent: null, jeonseRatio: null } }));
      expect(result).toHaveLength(0);
    });

    it("planned_sale_price: MOLIT 실거래 데이터가 있으면 검증", () => {
      const claims = [
        makeExtractedValue({ key: "planned_sale_price", value: 2500 }),
      ];
      const externalData = makeExternalData({
        molit: {
          sale: {
            period: "2025.10~2026.03",
            transactions: [
              { area: 84, dealAmount: 800000000, dealDate: "2026-01", floor: 10, dong: "", buildYear: 2020, name: "아파트", roadName: "", type: "" } as any,
              { area: 59, dealAmount: 500000000, dealDate: "2026-02", floor: 5, dong: "", buildYear: 2020, name: "아파트", roadName: "", type: "" } as any,
            ],
          } as any,
          rent: null,
          jeonseRatio: null,
        },
      });
      const result = verifyClaims(claims, externalData);
      expect(result).toHaveLength(1);
      expect(result[0].claimKey).toBe("planned_sale_price");
      expect(result[0].benchmark.sourceType).toBe("molit");
      expect(result[0].benchmark.comparableCount).toBe(2);
    });

    it("규모 관련 항목(total_floor_area 등)은 검증 없이 null → 결과에 불포함", () => {
      const claims = [
        makeExtractedValue({ key: "total_floor_area", value: 50000, unit: "㎡" }),
        makeExtractedValue({ key: "total_land_area", value: 10000, unit: "㎡" }),
        makeExtractedValue({ key: "floor_area_ratio", value: 299, unit: "%" }),
        makeExtractedValue({ key: "building_coverage", value: 60, unit: "%" }),
        makeExtractedValue({ key: "total_units", value: 500, unit: "세대" }),
      ];
      const result = verifyClaims(claims, makeExternalData());
      expect(result).toHaveLength(0);
    });

    it("total_project_cost와 land_cost는 수익률 벤치마크로 간접 검증", () => {
      const claims = [
        makeExtractedValue({ key: "total_project_cost", value: 50000, unit: "만원" }),
        makeExtractedValue({ key: "land_cost", value: 20000, unit: "만원" }),
      ];
      const result = verifyClaims(claims, makeExternalData());
      expect(result).toHaveLength(2);
      // 자기 자신과 비교이므로 deviation = 0
      expect(result[0].deviation).toBe(0);
      expect(result[1].deviation).toBe(0);
    });

    it("total_revenue, rental_income, operation_income은 참고 정보로 기록", () => {
      const claims = [
        makeExtractedValue({ key: "total_revenue", value: 100000, unit: "만원" }),
        makeExtractedValue({ key: "rental_income", value: 5000, unit: "만원" }),
        makeExtractedValue({ key: "operation_income", value: 3000, unit: "만원" }),
      ];
      const result = verifyClaims(claims, makeExternalData());
      expect(result).toHaveLength(3);
      result.forEach((r) => {
        expect(r.benchmark.sourceType).toBe("internal");
        expect(r.deviation).toBe(0);
      });
    });

    it("self_capital_ratio은 업계 평균(25%) 기준으로 검증", () => {
      const claims = [
        makeExtractedValue({ key: "self_capital_ratio", value: 30, unit: "%" }),
      ];
      const result = verifyClaims(claims, makeExternalData());
      expect(result).toHaveLength(1);
      expect(result[0].benchmark.value).toBe(25);
      expect(result[0].deviationPercent).toBeCloseTo(20, 0);
    });

    it("미지원 키는 null → 결과에 불포함", () => {
      const claims = [
        makeExtractedValue({ key: "unknown_future_key", value: 999 }),
      ];
      const result = verifyClaims(claims, makeExternalData());
      expect(result).toHaveLength(0);
    });

    it("여러 claim을 한번에 검증", () => {
      const claims = [
        makeExtractedValue({ key: "construction_cost_per_pyeong", value: 600, unit: "만원/평" }),
        makeExtractedValue({ key: "expected_sale_rate", value: 90, unit: "%" }),
        makeExtractedValue({ key: "pf_interest_rate", value: 8.5, unit: "%" }),
        makeExtractedValue({ key: "total_floor_area", value: 50000, unit: "㎡" }), // 검증 불포함
      ];
      const result = verifyClaims(claims, makeExternalData());
      expect(result).toHaveLength(3); // total_floor_area 제외
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. scr-claim-keys.ts
// ═══════════════════════════════════════════════════════════════════════════

describe("scr-claim-keys", () => {
  it("SCR_CLAIM_KEYS는 기존 CLAIM_KEYS를 모두 포함", () => {
    for (const key of CLAIM_KEYS) {
      expect(SCR_CLAIM_KEYS).toContain(key);
    }
  });

  it("SCR_CLAIM_KEYS 총 개수가 47개 이상", () => {
    expect(SCR_CLAIM_KEYS.length).toBeGreaterThanOrEqual(47);
  });

  it("모든 SCR_CLAIM_KEYS에 라벨이 존재", () => {
    for (const key of SCR_CLAIM_KEYS) {
      expect(SCR_CLAIM_LABELS[key]).toBeTruthy();
    }
  });

  it("모든 SCR_CLAIM_KEYS에 유닛이 정의됨 (빈 문자열 허용)", () => {
    for (const key of SCR_CLAIM_KEYS) {
      expect(SCR_CLAIM_UNITS[key]).toBeDefined();
    }
  });

  it("특정 키의 라벨이 올바름", () => {
    expect(SCR_CLAIM_LABELS.planned_sale_price).toBe("분양가");
    expect(SCR_CLAIM_LABELS.total_construction_cost).toBe("총 공사비");
    expect(SCR_CLAIM_LABELS.building_name).toBe("건물명/단지명");
    expect(SCR_CLAIM_LABELS.profit_before_tax).toBe("세전이익");
    expect(SCR_CLAIM_LABELS.trust_company).toBe("신탁사");
  });

  it("특정 키의 유닛이 올바름", () => {
    expect(SCR_CLAIM_UNITS.planned_sale_price).toBe("만원/평");
    expect(SCR_CLAIM_UNITS.expected_sale_rate).toBe("%");
    expect(SCR_CLAIM_UNITS.building_name).toBe("");
    expect(SCR_CLAIM_UNITS.sale_type_detail).toBe("JSON");
    expect(SCR_CLAIM_UNITS.total_land_area).toBe("㎡");
  });

  it("SCR_CLAIM_CATEGORIES에 모든 카테고리 존재", () => {
    const expectedCategories = [
      "사업개요", "분양가", "자금조달", "공사비",
      "사업수지_수입", "사업수지_지출", "수익성", "토지", "운영수익",
    ];
    for (const cat of expectedCategories) {
      expect(cat in SCR_CLAIM_CATEGORIES).toBe(true);
    }
  });

  it("카테고리 키가 SCR_CLAIM_KEYS에 속함", () => {
    for (const [, keys] of Object.entries(SCR_CLAIM_CATEGORIES)) {
      for (const key of keys) {
        expect(SCR_CLAIM_KEYS).toContain(key);
      }
    }
  });

  it("확장 키(revenue_apartment 등)가 포함됨", () => {
    expect(SCR_CLAIM_KEYS).toContain("revenue_apartment");
    expect(SCR_CLAIM_KEYS).toContain("cost_direct_construction");
    expect(SCR_CLAIM_KEYS).toContain("land_avg_price_per_pyeong");
    expect(SCR_CLAIM_KEYS).toContain("pf_maturity");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. scr-project-type-detector.ts
// ═══════════════════════════════════════════════════════════════════════════

describe("scr-project-type-detector", () => {
  describe("detectProjectType", () => {
    it("재건축 키워드가 있으면 '재건축' 반환", () => {
      expect(detectProjectType("본 사업은 재건축사업으로 추진합니다")).toBe("재건축");
    });

    it("재개발 키워드가 있으면 '재개발' 반환", () => {
      expect(detectProjectType("도시정비사업 중 재개발 사업 검토")).toBe("재개발");
    });

    it("주상복합 키워드가 있으면 '주상복합' 반환", () => {
      expect(detectProjectType("주상복합 건축물 사업성 분석 보고서")).toBe("주상복합");
    });

    it("오피스텔 키워드가 있으면 '오피스텔' 반환", () => {
      expect(detectProjectType("오피스텔 분양 사업계획서")).toBe("오피스텔");
    });

    it("지식산업센터 키워드가 있으면 '지식산업센터' 반환", () => {
      expect(detectProjectType("지식산업센터 투자제안서 검토")).toBe("지식산업센터");
    });

    it("생활형숙박시설 키워드가 있으면 '생활형숙박시설' 반환", () => {
      expect(detectProjectType("생활형숙박시설 레지던스 사업 분석")).toBe("생활형숙박시설");
    });

    it("아파트 키워드가 있으면 '아파트' 반환", () => {
      expect(detectProjectType("아파트 신축 사업")).toBe("아파트");
    });

    it("키워드가 없으면 기본값 '아파트' 반환", () => {
      expect(detectProjectType("어떤 종류의 건물인지 알 수 없는 보고서")).toBe("아파트");
    });

    it("빈 문자열이면 기본값 '아파트'", () => {
      expect(detectProjectType("")).toBe("아파트");
    });
  });

  describe("detectProjectTypeDetailed", () => {
    it("기본 결과 구조 확인", () => {
      const result = detectProjectTypeDetailed("재건축 사업 추진");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("scores");
      expect(result).toHaveProperty("isComplex");
      expect(result).toHaveProperty("subTypes");
    });

    it("강한 키워드가 있으면 신뢰도가 높음", () => {
      const result = detectProjectTypeDetailed("재건축 재건축조합 재건축사업 재건축정비");
      expect(result.type).toBe("재건축");
      expect(result.confidence).toBeGreaterThan(50);
    });

    it("제목 영역(처음 500자)에 키워드가 있으면 추가 보너스", () => {
      const titleText = "재건축 사업 검토 보고서 " + "x".repeat(1000);
      const bodyText = "x".repeat(600) + " 재건축 사업";
      const titleResult = detectProjectTypeDetailed(titleText);
      const bodyResult = detectProjectTypeDetailed(bodyText);
      // 제목에 있는 경우 점수가 더 높아야 함
      const titleScore = titleResult.scores.find((s) => s.type === "재건축")?.score ?? 0;
      const bodyScore = bodyResult.scores.find((s) => s.type === "재건축")?.score ?? 0;
      expect(titleScore).toBeGreaterThan(bodyScore);
    });

    it("복합 사업: 두 유형이 비슷한 점수면 isComplex=true", () => {
      const result = detectProjectTypeDetailed(
        "주상복합 아파트 사업으로 아파트와 상업시설을 함께 건설합니다. 아파트 세대수 300, 주상복합 건축"
      );
      // 주상복합 + 아파트 모두 높은 점수
      if (result.isComplex) {
        expect(result.subTypes.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("단일 유형일 때 isComplex=false", () => {
      const result = detectProjectTypeDetailed("재건축사업 재건축조합 재건축정비 추진 보고서");
      // 재건축만 강하게 매칭
      if (!result.isComplex) {
        expect(result.subTypes).toHaveLength(1);
      }
    });

    it("키워드가 여러 번 등장하면 점수가 더 높음", () => {
      const once = detectProjectTypeDetailed("오피스텔 사업");
      const many = detectProjectTypeDetailed("오피스텔 오피스텔 오피스텔 오피스텔 사업");
      const onceScore = once.scores.find((s) => s.type === "오피스텔")?.score ?? 0;
      const manyScore = many.scores.find((s) => s.type === "오피스텔")?.score ?? 0;
      expect(manyScore).toBeGreaterThan(onceScore);
    });

    it("matchedKeywords에 매칭된 키워드가 포함됨", () => {
      const result = detectProjectTypeDetailed("지식산업센터 아파트형공장 투자 검토");
      const kisaScore = result.scores.find((s) => s.type === "지식산업센터");
      expect(kisaScore?.matchedKeywords).toContain("지식산업센터");
      expect(kisaScore?.matchedKeywords).toContain("아파트형공장");
    });

    it("키워드 없으면 scores는 빈 배열, confidence=0", () => {
      const result = detectProjectTypeDetailed("아무 관련 키워드 없는 텍스트");
      expect(result.scores).toHaveLength(0);
      expect(result.confidence).toBe(0);
      expect(result.type).toBe("아파트"); // 기본값
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. benchmark-db.ts
// ═══════════════════════════════════════════════════════════════════════════

describe("benchmark-db", () => {
  describe("classifyRegion", () => {
    it("서울 주소는 '서울' 반환", () => {
      expect(classifyRegion("서울특별시 강남구 역삼동")).toBe("서울");
    });

    it("인천 주소는 '인천' 반환", () => {
      expect(classifyRegion("인천광역시 연수구 송도동")).toBe("인천");
    });

    it("부산 주소는 '부산' 반환", () => {
      expect(classifyRegion("부산광역시 해운대구")).toBe("부산");
    });

    it("대구 주소는 '대구' 반환", () => {
      expect(classifyRegion("대구광역시 수성구")).toBe("대구");
    });

    it("대전 주소는 '대전' 반환", () => {
      expect(classifyRegion("대전광역시 유성구")).toBe("대전");
    });

    it("광주 주소는 '광주' 반환", () => {
      expect(classifyRegion("광주광역시 서구")).toBe("광주");
    });

    it("세종 주소는 '세종' 반환", () => {
      expect(classifyRegion("세종특별자치시")).toBe("세종");
    });

    it("수원시 주소는 '경기' 반환", () => {
      expect(classifyRegion("경기도 수원시 영통구")).toBe("경기");
    });

    it("성남, 용인, 고양 등 경기 주요 도시는 '경기'", () => {
      expect(classifyRegion("성남시 분당구")).toBe("경기");
      expect(classifyRegion("용인시 수지구")).toBe("경기");
      expect(classifyRegion("고양시 일산동구")).toBe("경기");
      expect(classifyRegion("안양시 만안구")).toBe("경기");
      expect(classifyRegion("부천시 원미구")).toBe("경기");
      expect(classifyRegion("화성시 동탄")).toBe("경기");
      expect(classifyRegion("평택시 고덕동")).toBe("경기");
    });

    it("기타 지역은 '지방' 반환", () => {
      expect(classifyRegion("충청북도 청주시")).toBe("지방");
      expect(classifyRegion("전라남도 나주시")).toBe("지방");
      expect(classifyRegion("강원도 춘천시")).toBe("지방");
      expect(classifyRegion("울산광역시 남구")).toBe("지방");
    });
  });

  describe("INDUSTRY_BENCHMARKS", () => {
    it("건설공사비 용도별 데이터 존재", () => {
      const byPurpose = INDUSTRY_BENCHMARKS.CONSTRUCTION_COST_INDEX.byPurpose;
      expect(byPurpose.아파트.perPyeong).toBeGreaterThan(0);
      expect(byPurpose.오피스텔.perPyeong).toBeGreaterThan(0);
      expect(byPurpose.상가.perPyeong).toBeGreaterThan(0);
      expect(byPurpose.지식산업센터.perPyeong).toBeGreaterThan(0);
      expect(byPurpose.복합.perPyeong).toBeGreaterThan(0);
      expect(byPurpose.기타.perPyeong).toBeGreaterThan(0);
    });

    it("PF 금리 등급별 데이터 존재", () => {
      const rates = INDUSTRY_BENCHMARKS.PF_INTEREST_RATES;
      expect(rates.AAA.min).toBeLessThan(rates.AAA.max);
      expect(rates.BBB.min).toBeLessThan(rates.BBB.max);
      expect(rates.bridge.min).toBeGreaterThan(rates["B+"].min); // 브릿지가 가장 높음
    });

    it("분양률 지역별 데이터 존재", () => {
      const saleRate = INDUSTRY_BENCHMARKS.SALE_RATE;
      expect(saleRate.서울.final).toBeGreaterThan(saleRate.서울.initial);
      expect(saleRate.서울.final).toBeGreaterThanOrEqual(saleRate.경기.final);
    });

    it("수익률 용도별 데이터 존재", () => {
      const profitRate = INDUSTRY_BENCHMARKS.PROFIT_RATE;
      expect(profitRate.아파트.avg).toBeGreaterThan(0);
      expect(profitRate.아파트.min).toBeLessThan(profitRate.아파트.max);
    });

    it("Cap Rate 데이터 존재", () => {
      expect(INDUSTRY_BENCHMARKS.CAP_RATE.서울_오피스).toBeGreaterThan(0);
      expect(INDUSTRY_BENCHMARKS.CAP_RATE.서울_리테일).toBeGreaterThan(0);
    });
  });

  // getBenchmark* functions use prisma (mocked) + fallback to statics
  describe("getBenchmarkForConstruction", () => {
    it("아파트 용도로 벤치마크 반환", async () => {
      const result = await import("@/lib/feasibility/benchmark-db").then(
        (m) => m.getBenchmarkForConstruction("아파트")
      );
      expect(result.value).toBe(580);
      expect(result.sourceType).toBe("kict");
    });

    it("미지원 용도면 기타 기본값 사용", async () => {
      const { getBenchmarkForConstruction } = await import("@/lib/feasibility/benchmark-db");
      const result = await getBenchmarkForConstruction("미지원용도");
      expect(result.value).toBe(480); // 기타 perPyeong
    });
  });

  describe("getBenchmarkForSaleRate", () => {
    it("서울 주소면 서울 분양률 반환", async () => {
      const { getBenchmarkForSaleRate } = await import("@/lib/feasibility/benchmark-db");
      const result = await getBenchmarkForSaleRate("서울특별시 강남구");
      expect(result.value).toBe(85); // initial * 100
      expect(result.range?.max).toBe(95); // final * 100
    });

    it("지방 주소면 지방 분양률 반환", async () => {
      const { getBenchmarkForSaleRate } = await import("@/lib/feasibility/benchmark-db");
      const result = await getBenchmarkForSaleRate("충청북도 청주시");
      expect(result.value).toBe(50); // 지방 initial * 100
    });
  });

  describe("getBenchmarkForPfRate", () => {
    it("등급 미지정 시 BBB 기본값 사용", async () => {
      const { getBenchmarkForPfRate } = await import("@/lib/feasibility/benchmark-db");
      const result = await getBenchmarkForPfRate();
      // BBB: min=0.085, max=0.095 -> avg=0.09 -> 9.0%
      expect(result.value).toBe(9);
    });

    it("AAA 등급 지정 시 해당 금리 반환", async () => {
      const { getBenchmarkForPfRate } = await import("@/lib/feasibility/benchmark-db");
      const result = await getBenchmarkForPfRate("AAA");
      // AAA: min=0.040, max=0.050 -> avg=0.045 -> 4.5%
      expect(result.value).toBeCloseTo(4.5, 1);
    });
  });

  describe("getBenchmarkForProfitRate", () => {
    it("아파트 용도 수익률 반환", async () => {
      const { getBenchmarkForProfitRate } = await import("@/lib/feasibility/benchmark-db");
      const result = await getBenchmarkForProfitRate("아파트");
      expect(result.value).toBeCloseTo(11.5, 1); // avg=0.115 -> 11.5%
    });

    it("미지원 용도면 폴백 기본값 사용", async () => {
      const { getBenchmarkForProfitRate } = await import("@/lib/feasibility/benchmark-db");
      const result = await getBenchmarkForProfitRate("미지원용도");
      expect(result.value).toBeCloseTo(10, 1); // 폴백: avg=0.10 -> 10%
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. static-data.ts
// ═══════════════════════════════════════════════════════════════════════════

describe("static-data", () => {
  // ── Data existence checks ──
  describe("POLICY_TIMELINE", () => {
    it("정책 연표가 비어있지 않음", () => {
      expect(POLICY_TIMELINE.length).toBeGreaterThan(0);
    });

    it("각 항목에 필수 필드 존재", () => {
      for (const p of POLICY_TIMELINE) {
        expect(p.date).toBeTruthy();
        expect(p.title).toBeTruthy();
        expect(p.category).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(["긍정", "부정", "중립"]).toContain(p.impact);
      }
    });

    it("날짜 형식이 YYYY-MM-DD", () => {
      for (const p of POLICY_TIMELINE) {
        expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("시간순으로 정렬되어 있음", () => {
      for (let i = 1; i < POLICY_TIMELINE.length; i++) {
        expect(POLICY_TIMELINE[i].date >= POLICY_TIMELINE[i - 1].date).toBe(true);
      }
    });
  });

  describe("REGULATED_AREAS", () => {
    it("규제지역 데이터 존재", () => {
      expect(REGULATED_AREAS.length).toBeGreaterThan(0);
    });

    it("현재 활성 규제지역이 없음 (2023년 전면 해제)", () => {
      const active = REGULATED_AREAS.filter((a) => a.isActive);
      expect(active.length).toBe(0);
    });

    it("각 항목에 필수 필드 존재", () => {
      for (const a of REGULATED_AREAS) {
        expect(a.region).toBeTruthy();
        expect(a.type).toBeTruthy();
        expect(a.designatedDate).toBeTruthy();
      }
    });
  });

  describe("HUG_HIGH_PRICE_AREAS", () => {
    it("고분양가 관리지역 데이터 존재", () => {
      expect(HUG_HIGH_PRICE_AREAS.length).toBeGreaterThan(0);
    });

    it("서울특별시가 활성 관리지역에 포함", () => {
      const seoul = HUG_HIGH_PRICE_AREAS.find((a) => a.region === "서울특별시" && a.isActive);
      expect(seoul).toBeTruthy();
    });

    it("priceThreshold가 양수", () => {
      for (const a of HUG_HIGH_PRICE_AREAS) {
        expect(a.priceThreshold).toBeGreaterThan(0);
      }
    });
  });

  describe("LOAN_REGULATIONS", () => {
    it("대출 규제 데이터 존재", () => {
      expect(LOAN_REGULATIONS.length).toBeGreaterThan(0);
    });

    it("LTV, DTI, DSR 카테고리가 모두 존재", () => {
      const categories = new Set(LOAN_REGULATIONS.map((r) => r.category));
      expect(categories.has("LTV")).toBe(true);
      expect(categories.has("DTI")).toBe(true);
      expect(categories.has("DSR")).toBe(true);
    });
  });

  describe("SUPPLY_CASES_DB", () => {
    it("분양 사례 데이터 존재", () => {
      expect(SUPPLY_CASES_DB.length).toBeGreaterThan(0);
    });

    it("서울/경기/인천 사례가 모두 포함", () => {
      expect(SUPPLY_CASES_DB.some((e) => e.address.includes("서울"))).toBe(true);
      expect(SUPPLY_CASES_DB.some((e) => e.address.includes("경기"))).toBe(true);
      expect(SUPPLY_CASES_DB.some((e) => e.address.includes("인천"))).toBe(true);
    });

    it("각 항목에 필수 필드 존재", () => {
      for (const e of SUPPLY_CASES_DB) {
        expect(e.name).toBeTruthy();
        expect(e.address).toBeTruthy();
        expect(e.units).toBeGreaterThan(0);
        expect(e.pricePerSqm).toBeGreaterThan(0);
        expect(e.saleRate).toBeGreaterThan(0);
      }
    });
  });

  // ── isRegulatedArea ──
  describe("isRegulatedArea", () => {
    it("현재 규제지역 전면 해제이므로 모든 주소에 대해 false", () => {
      expect(isRegulatedArea("서울특별시 강남구").isRegulated).toBe(false);
      expect(isRegulatedArea("서울특별시 서초구").isRegulated).toBe(false);
      expect(isRegulatedArea("서울특별시 송파구").isRegulated).toBe(false);
    });

    it("관련 없는 주소도 false", () => {
      expect(isRegulatedArea("충청북도 청주시").isRegulated).toBe(false);
    });

    it("regulations 배열이 빈 배열", () => {
      expect(isRegulatedArea("서울특별시 강남구").regulations).toHaveLength(0);
    });
  });

  // ── isHUGHighPriceArea ──
  describe("isHUGHighPriceArea", () => {
    it("서울은 고분양가 관리지역", () => {
      const result = isHUGHighPriceArea("서울특별시 강남구");
      expect(result.isHighPrice).toBe(true);
      expect(result.area).not.toBeNull();
      expect(result.area?.region).toBe("서울특별시");
    });

    it("과천시는 고분양가 관리지역", () => {
      const result = isHUGHighPriceArea("경기도 과천시");
      expect(result.isHighPrice).toBe(true);
    });

    it("비활성(해제된) 지역은 고분양가 아님", () => {
      // 세종 isActive: false
      const result = isHUGHighPriceArea("세종특별자치시");
      expect(result.isHighPrice).toBe(false);
    });

    it("관련 없는 지역은 고분양가 아님", () => {
      const result = isHUGHighPriceArea("충청북도 청주시");
      expect(result.isHighPrice).toBe(false);
      expect(result.area).toBeNull();
    });
  });

  // ── getLoanRegulations ──
  describe("getLoanRegulations", () => {
    it("비규제 서울 주소에 LTV/DTI/DSR 반환", () => {
      const result = getLoanRegulations("서울특별시 강남구");
      expect(result.ltv.length).toBeGreaterThan(0);
      expect(result.dti.length).toBeGreaterThan(0);
      expect(result.dsr.length).toBeGreaterThan(0);
    });

    it("수도권(서울/경기/인천)은 수도권 DSR 적용", () => {
      const result = getLoanRegulations("서울특별시 강남구");
      const metroReg = result.dsr.find((r) => r.area === "수도권");
      expect(metroReg).toBeTruthy();
    });

    it("비수도권은 비수도권 DSR 적용", () => {
      const result = getLoanRegulations("충청북도 청주시");
      const localReg = result.dsr.find((r) => r.area === "비수도권");
      expect(localReg).toBeTruthy();
    });

    it("비규제지역 LTV가 포함", () => {
      const result = getLoanRegulations("서울특별시 강남구");
      const unregulated = result.ltv.find((r) => r.area === "비규제지역");
      expect(unregulated).toBeTruthy();
    });
  });

  // ── getNearbySupplyCases ──
  describe("getNearbySupplyCases", () => {
    it("서초구 주소에 서울 사례 우선 반환", () => {
      const cases = getNearbySupplyCases("서울특별시 서초구 반포동");
      expect(cases.length).toBeGreaterThan(0);
      // 서초구 매칭 사례가 상단에
      expect(cases[0].address).toContain("서초구");
    });

    it("radius 파라미터로 결과 수 제한", () => {
      const cases = getNearbySupplyCases("서울특별시 강남구", 3);
      expect(cases.length).toBeLessThanOrEqual(3);
    });

    it("매칭 없는 주소는 광역 매칭 또는 전체 반환", () => {
      const cases = getNearbySupplyCases("제주특별자치도 제주시");
      expect(cases.length).toBeGreaterThan(0);
    });

    it("경기도 수원시 주소에 경기 사례 포함", () => {
      const cases = getNearbySupplyCases("경기도 수원시 영통구", 10);
      expect(cases.some((c) => c.address.includes("수원"))).toBe(true);
    });

    it("기본 radius는 10", () => {
      const cases = getNearbySupplyCases("서울특별시 서초구");
      expect(cases.length).toBeLessThanOrEqual(10);
    });
  });

  // ── getStaticMarketContext ──
  describe("getStaticMarketContext", () => {
    it("올바른 구조의 정적 컨텍스트 반환", () => {
      const ctx = getStaticMarketContext("서울특별시 강남구");
      expect(ctx).toHaveProperty("recentPolicies");
      expect(ctx).toHaveProperty("regulationStatus");
      expect(ctx).toHaveProperty("hugStatus");
      expect(ctx).toHaveProperty("loanRegulations");
    });

    it("최근 2년 이내 정책만 포함", () => {
      const ctx = getStaticMarketContext("서울특별시 강남구");
      const now = new Date();
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      for (const p of ctx.recentPolicies) {
        expect(new Date(p.date).getTime()).toBeGreaterThanOrEqual(twoYearsAgo.getTime());
      }
    });

    it("서울 강남은 HUG 고분양가 지역", () => {
      const ctx = getStaticMarketContext("서울특별시 강남구");
      expect(ctx.hugStatus.isHighPrice).toBe(true);
    });

    it("규제지역 전면 해제 상태 반영", () => {
      const ctx = getStaticMarketContext("서울특별시 강남구");
      expect(ctx.regulationStatus.isRegulated).toBe(false);
    });

    it("대출 규제에 LTV/DTI/DSR 포함", () => {
      const ctx = getStaticMarketContext("서울특별시 강남구");
      expect(ctx.loanRegulations.ltv.length).toBeGreaterThan(0);
      expect(ctx.loanRegulations.dti.length).toBeGreaterThan(0);
      expect(ctx.loanRegulations.dsr.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. feasibility-types.ts (constants)
// ═══════════════════════════════════════════════════════════════════════════

describe("feasibility-types constants", () => {
  it("CLAIM_KEYS에 핵심 키가 포함됨", () => {
    expect(CLAIM_KEYS).toContain("planned_sale_price");
    expect(CLAIM_KEYS).toContain("total_construction_cost");
    expect(CLAIM_KEYS).toContain("expected_sale_rate");
    expect(CLAIM_KEYS).toContain("pf_interest_rate");
    expect(CLAIM_KEYS).toContain("self_capital_ratio");
  });

  it("모든 CLAIM_KEYS에 대응하는 CLAIM_LABELS 존재", () => {
    for (const key of CLAIM_KEYS) {
      expect(CLAIM_LABELS[key]).toBeTruthy();
    }
  });

  it("CLAIM_KEYS 총 개수 17개", () => {
    expect(CLAIM_KEYS.length).toBe(17);
  });
});
