/**
 * SCR 오케스트레이터 테스트
 *
 * scr-orchestrator.ts (979줄) 커버리지 극대화를 위한 통합 테스트.
 * 모든 외부 의존성(API, calc, static-data)을 mock 처리.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { ParsedDocument } from "@/lib/feasibility/feasibility-types";

// ─── vi.hoisted: mock 팩토리에서 참조할 데이터를 hoisting 안전하게 선언 ───

const {
  mockBusinessIncome,
  mockBepResult,
  mockDscrResult,
  mockMonthlyCashflow,
  mockScenarioResult,
  mockSensitivity,
  mockPriceForecast,
  mockStaticMarket,
} = vi.hoisted(() => {
  const mockMonthlyRow = {
    period: "'26.01",
    monthIndex: 1,
    revenue: { apartment: 10000 },
    revenueTotal: 10000,
    cost: { land: 5000 },
    costTotal: 5000,
    operatingCashflow: 5000,
    fundingItems: {},
    fundingTotal: 0,
    repaymentItems: {},
    repaymentTotal: 0,
    cashChange: 5000,
    cashBalance: 5000,
  };

  return {
    mockBusinessIncome: {
      totalRevenue: 1000000,
      totalCost: 800000,
      financeCostSubtotal: 50000,
      profitBeforeTax: 200000,
      profitRate: 20,
      breakdown: [
        { item: "아파트 분양수입", amount: 600000, ratio: 60 },
        { item: "오피스텔 분양수입", amount: 150000, ratio: 15 },
        { item: "발코니확장비", amount: 50000, ratio: 5 },
        { item: "상가 분양수입", amount: 100000, ratio: 10 },
        { item: "중도금이자후불", amount: 30000, ratio: 3 },
        { item: "VAT", amount: 70000, ratio: 7 },
        { item: "토지비", amount: 300000, ratio: 30 },
        { item: "직접공사비", amount: 200000, ratio: 20 },
        { item: "간접공사비", amount: 50000, ratio: 5 },
        { item: "판매비", amount: 30000, ratio: 3 },
        { item: "일반부대비용", amount: 40000, ratio: 4 },
        { item: "제세공과금", amount: 20000, ratio: 2 },
        { item: "PF 수수료", amount: 10000, ratio: 1 },
        { item: "PF 이자", amount: 30000, ratio: 3 },
        { item: "중도금대출이자", amount: 10000, ratio: 1 },
      ],
    },

    mockBepResult: {
      bep1: { businessBep: 80, costExitBep: 75, pfExitBep: 60 },
      bep2: { businessBep: 85, costExitBep: 80, pfExitBep: 65 },
      bep3: { businessBep: 90, costExitBep: 85, pfExitBep: 70 },
    },

    mockDscrResult: {
      cumulativeDscr: 1.25,
      creditEnhancement: 0,
      isAdequate: true,
      pfDebtService: 500000,
      availableIncome: 625000,
    },

    mockMonthlyCashflow: {
      rows: [mockMonthlyRow],
      part1: [mockMonthlyRow],
      part2: [mockMonthlyRow],
      part3: [mockMonthlyRow],
      summary: {
        totalRevenue: 1000000,
        totalCost: 800000,
        totalFunding: 500000,
        totalRepayment: 500000,
        finalCashBalance: 200000,
      },
    },

    mockScenarioResult: {
      conditions: [
        {
          type: "아파트 분양률",
          base: 100,
          values: { "시나리오1": 95, "시나리오2": 90, "시나리오3": 85 },
        },
      ],
      projections: [
        {
          name: "차주안",
          revenue: { apartment: 600000 },
          totalRevenue: 1000000,
          totalCost: 800000,
          profitBeforeTax: 200000,
          profitRate: 20,
        },
        {
          name: "시나리오1",
          revenue: { apartment: 570000 },
          totalRevenue: 950000,
          totalCost: 800000,
          profitBeforeTax: 150000,
          profitRate: 15.8,
        },
        {
          name: "시나리오2",
          revenue: { apartment: 540000 },
          totalRevenue: 900000,
          totalCost: 800000,
          profitBeforeTax: 100000,
          profitRate: 11.1,
        },
        {
          name: "시나리오3",
          revenue: { apartment: 510000 },
          totalRevenue: 850000,
          totalCost: 800000,
          profitBeforeTax: 50000,
          profitRate: 5.9,
        },
      ],
    },

    mockSensitivity: {
      scenarios: [
        {
          name: "차주안",
          maturitySaleRate: 100,
          totalRevenue: 1000000,
          profitBeforeTax: 200000,
          profitRate: 20,
          cumulativeDscr: 1.25,
          creditEnhancement: 0,
          unsoldInventory: 0,
        },
        {
          name: "시나리오1",
          maturitySaleRate: 95,
          totalRevenue: 950000,
          profitBeforeTax: 150000,
          profitRate: 15.8,
          cumulativeDscr: 1.15,
          creditEnhancement: 0,
          unsoldInventory: 50000,
        },
      ],
    },

    mockPriceForecast: {
      currentAvgPrice: 2500,
      priceRange: { min: 2000, max: 3000 },
      avgPremiumRate: 5.5,
      annualGrowthRate: 3.2,
      forecast: {
        conservative: 2600,
        moderate: 2800,
        optimistic: 3000,
      },
      priceComparison: {
        plannedPrice: 2700,
        currentAvg: 2500,
        gapAmount: 200,
        gapRate: 8,
        assessment: "적정" as const,
      },
    },

    mockStaticMarket: {
      recentPolicies: [
        {
          date: "2024-01-10",
          title: "1.10 대책",
          category: "규제완화" as const,
          description: "규제지역 일부 해제",
          impact: "긍정" as const,
        },
      ],
      regulationStatus: {
        isRegulated: true,
        regulations: [
          {
            region: "서울특별시 강남구",
            type: "투기과열지구" as const,
            designatedDate: "2017-08-02",
            isActive: true,
          },
        ],
      },
      hugStatus: {
        isHighPrice: true,
        area: {
          region: "서울특별시 강남구",
          designatedDate: "2020-01-01",
          priceThreshold: 3000,
          isActive: true,
        },
      },
      loanRegulations: {
        ltv: [
          {
            category: "LTV",
            area: "투기과열지구",
            ratio: 40,
            condition: "9억 초과분",
            effectiveDate: "2020-06-17",
          },
        ],
        dti: [
          {
            category: "DTI",
            area: "투기과열지구",
            ratio: 40,
            condition: "주담대",
            effectiveDate: "2020-06-17",
          },
        ],
        dsr: [
          {
            category: "DSR",
            area: "전지역",
            ratio: 40,
            condition: "총대출 1억 초과",
            effectiveDate: "2023-01-01",
          },
        ],
      },
    },
  };
});

// ─── Mock: 외부 API ───
vi.mock("@/lib/feasibility/api", () => ({
  fetchPopulationTrends: vi.fn().mockResolvedValue({
    district: "서울특별시 강남구",
    trends: [
      { year: 2023, population: 540000, households: 230000 },
      { year: 2024, population: 538000, households: 232000 },
    ],
  }),
  fetchHousingSupply: vi.fn().mockResolvedValue({
    district: "서울특별시 강남구",
    trends: [
      { year: 2023, supplyRate: 105.2, totalHousing: 250000 },
      { year: 2024, supplyRate: 106.1, totalHousing: 255000 },
    ],
  }),
  fetchCorpInfo: vi.fn().mockResolvedValue({
    corpCode: "00123456",
    corpName: "테스트건설",
    ceoName: "홍길동",
    establishDate: "2000-01-01",
  }),
  fetchFinancials: vi.fn().mockResolvedValue({
    incomeStatements: [
      {
        year: 2023,
        revenue: 500000,
        costOfSales: 400000,
        grossProfit: 100000,
        operatingProfit: 80000,
        ebitda: 90000,
        netIncome: 60000,
      },
    ],
    balanceSheets: [
      {
        year: 2023,
        totalAssets: 1000000,
        totalLiabilities: 600000,
      },
    ],
  }),
  searchCorpCode: vi.fn().mockResolvedValue({
    corpCode: "00123456",
    corpName: "테스트건설",
  }),
  fetchSalePriceIndex: vi.fn().mockResolvedValue({
    district: "서울특별시 강남구",
    indices: [
      { yearMonth: "2023-06", index: 102.5 },
      { yearMonth: "2024-06", index: 105.3 },
    ],
  }),
  fetchRentPriceIndex: vi.fn().mockResolvedValue({
    district: "서울특별시 강남구",
    indices: [
      { yearMonth: "2023-06", index: 100.8 },
      { yearMonth: "2024-06", index: 101.2 },
    ],
  }),
  fetchMOISPopulation: vi.fn().mockResolvedValue({
    district: "서울특별시 강남구",
    data: [],
  }),
  fetchMOISAgePopulation: vi.fn().mockResolvedValue({
    district: "서울특별시 강남구",
    ageGroups: [
      { ageGroup: "20대", total: 50000 },
      { ageGroup: "30대", total: 60000 },
    ],
  }),
}));

// ─── Mock: 계산 엔진 ───
vi.mock("@/lib/feasibility/calc", () => ({
  calculateBusinessIncome: vi.fn().mockReturnValue(mockBusinessIncome),
  calculateBep: vi.fn().mockReturnValue(mockBepResult),
  calculateDscr: vi.fn().mockReturnValue(mockDscrResult),
  generateMonthlyCashflow: vi.fn().mockReturnValue(mockMonthlyCashflow),
  calculateScenarios: vi.fn().mockReturnValue(mockScenarioResult),
  analyzeSensitivity: vi.fn().mockReturnValue(mockSensitivity),
  forecastPrice: vi.fn().mockReturnValue(mockPriceForecast),
}));

// ─── Mock: 정적 데이터 ───
vi.mock("@/lib/feasibility/static-data", () => ({
  getStaticMarketContext: vi.fn().mockReturnValue(mockStaticMarket),
  getNearbySupplyCases: vi.fn().mockReturnValue([
    {
      name: "테스트 아파트",
      address: "서울특별시 강남구 역삼동",
      units: 500,
      supplyDate: "2024-03",
      pricePerSqm: 3000,
      saleRate: 95,
      projectType: "아파트",
      competitionRate: 15,
    },
  ]),
}));

// ─── Import under test ───
import { generateScrReport, type ScrReportInput } from "@/lib/feasibility/scr-orchestrator";

// ─── API mocks reference (for assertions) ───
import {
  fetchPopulationTrends,
  fetchHousingSupply,
  searchCorpCode,
  fetchCorpInfo,
  fetchFinancials,
  fetchSalePriceIndex,
  fetchRentPriceIndex,
  fetchMOISPopulation,
  fetchMOISAgePopulation,
} from "@/lib/feasibility/api";

import {
  calculateBusinessIncome,
  calculateBep,
  calculateDscr,
  generateMonthlyCashflow,
  calculateScenarios,
  analyzeSensitivity,
  forecastPrice,
} from "@/lib/feasibility/calc";

import {
  getStaticMarketContext,
  getNearbySupplyCases,
} from "@/lib/feasibility/static-data";

// ─── 테스트 헬퍼 ───

/** 최소한의 유효한 ParsedDocument 생성 */
function createMinimalParsedDoc(
  overrides: Partial<ParsedDocument> = {}
): ParsedDocument {
  return {
    filename: "test-doc.pdf",
    fileType: "pdf",
    fileSize: 1024,
    extractedData: {},
    rawText: "",
    confidence: 85,
    ...overrides,
  };
}

/** extractedData에 특정 claim 값을 넣은 ParsedDocument */
function createParsedDocWithClaims(
  claims: Record<string, number | string>
): ParsedDocument {
  const extractedData: Record<string, {
    key: string;
    value: number;
    unit: string;
    sourceFile: string;
    context?: string;
  }> = {};

  for (const [key, rawVal] of Object.entries(claims)) {
    if (typeof rawVal === "number") {
      extractedData[key] = {
        key,
        value: rawVal,
        unit: "만원",
        sourceFile: "test-doc.pdf",
      };
    } else {
      extractedData[key] = {
        key,
        value: 0,
        unit: "",
        sourceFile: "test-doc.pdf",
        context: rawVal,
      };
    }
  }

  return createMinimalParsedDoc({ extractedData });
}

// ─── 테스트 시작 ───

describe("SCR Orchestrator — generateScrReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. 최소 입력으로 정상 보고서 생성 ──
  it("최소 입력으로 전체 보고서 구조를 반환한다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    expect(report).toBeDefined();
    expect(report.frontMatter).toBeDefined();
    expect(report.projectOverview).toBeDefined();
    expect(report.developerAnalysis).toBeDefined();
    expect(report.marketAnalysis).toBeDefined();
    expect(report.priceAdequacy).toBeDefined();
    expect(report.repaymentAnalysis).toBeDefined();
    expect(report.appendices).toBeDefined();
    expect(report.metadata).toBeDefined();
  });

  // ── 2. 풍부한 클레임 데이터로 보고서 생성 ──
  it("전체 claim 데이터가 있는 문서로 보고서를 생성한다", async () => {
    const doc = createParsedDocWithClaims({
      site_address: "서울특별시 강남구 역삼동 123-4",
      developer: "테스트개발(주)",
      constructor: "테스트건설(주)",
      building_name: "테스트 레미안",
      zone_district: "제3종일반주거지역",
      trust_company: "한국토지신탁",
      total_land_area: 15000,
      total_floor_area: 80000,
      building_coverage_ratio: 59.9,
      floor_area_ratio: 299.9,
      above_floors: 35,
      below_floors: 3,
      building_count: 5,
      total_units: 800,
      construction_period_months: 36,
      revenue_apartment: 600000,
      revenue_officetel: 150000,
      revenue_balcony: 50000,
      revenue_commercial: 100000,
      revenue_interim_interest: 30000,
      revenue_vat: 70000,
      cost_land: 300000,
      cost_direct_construction: 200000,
      cost_indirect_construction: 50000,
      cost_sales: 30000,
      cost_general_admin: 40000,
      cost_tax: 20000,
      cost_pf_fee: 10000,
      cost_pf_interest: 30000,
      cost_interim_interest: 10000,
      existing_pf_amount: 200000,
      new_pf_amount: 300000,
      pf_total: 500000,
      equity_amount: 100000,
      pf_interest_rate_existing: 6.5,
      pf_interest_rate_new: 7.0,
      pf_maturity: 36,
      planned_sale_price: 2700,
    });

    const input: ScrReportInput = {
      parsedDocs: [doc],
      projectType: "아파트",
      options: {
        analyst: "테스트 분석가",
        constructionMonths: 36,
        scenarioSaleRates: [1.0, 0.95, 0.9, 0.85],
        sensitivityChangePercents: [-10, -5, 0, 5, 10],
      },
    };

    const report = await generateScrReport(input);

    // frontMatter
    expect(report.frontMatter.reportNumber).toMatch(/^SCR-/);
    expect(report.frontMatter.projectName).toBe("테스트 레미안");
    expect(report.frontMatter.developer).toBe("테스트개발(주)");
    expect(report.frontMatter.analyst).toBe("테스트 분석가");
    expect(report.frontMatter.disclaimer).toContain("AI 기반 자동 분석");

    // projectOverview
    expect(report.projectOverview.projectSummary.siteAddress).toBe(
      "서울특별시 강남구 역삼동 123-4"
    );
    expect(report.projectOverview.projectSummary.constructor).toBe("테스트건설(주)");
    expect(report.projectOverview.projectSummary.purpose).toBe("아파트");
    expect(report.projectOverview.fundingPlan.pfTotal).toBe(500000);

    // metadata
    expect(report.metadata.version).toBe("1.0.0");
    expect(report.metadata.sourceFiles).toContain("test-doc.pdf");
  });

  // ── 3. progress 콜백 호출 검증 ──
  it("진행률 콜백이 올바른 순서로 호출된다", async () => {
    const progressCalls: Array<{ pct: number; msg: string }> = [];
    const onProgress = (pct: number, msg: string) => {
      progressCalls.push({ pct, msg });
    };

    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
      onProgress,
    };

    await generateScrReport(input);

    // 최소 5단계 진행률 콜백: 5, 15, 40, 50, 70, 80, 100
    expect(progressCalls.length).toBeGreaterThanOrEqual(5);

    const pcts = progressCalls.map((c) => c.pct);
    expect(pcts[0]).toBe(5);
    expect(pcts[pcts.length - 1]).toBe(100);

    // 단조 증가
    for (let i = 1; i < pcts.length; i++) {
      expect(pcts[i]).toBeGreaterThanOrEqual(pcts[i - 1]);
    }
  });

  // ── 4. onProgress 미제공 시 에러 없이 동작 ──
  it("onProgress 미제공 시에도 정상 동작한다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "오피스텔",
    };

    const report = await generateScrReport(input);
    expect(report).toBeDefined();
    expect(report.frontMatter).toBeDefined();
  });

  // ── 5. API 전부 실패해도 보고서 생성 (graceful degradation) ──
  it("모든 외부 API가 실패해도 보고서를 생성한다", async () => {
    vi.mocked(fetchPopulationTrends).mockRejectedValueOnce(new Error("KOSIS fail"));
    vi.mocked(fetchHousingSupply).mockRejectedValueOnce(new Error("KOSIS fail"));
    vi.mocked(searchCorpCode).mockRejectedValueOnce(new Error("DART fail"));
    vi.mocked(fetchSalePriceIndex).mockRejectedValueOnce(new Error("REPS fail"));
    vi.mocked(fetchRentPriceIndex).mockRejectedValueOnce(new Error("REPS fail"));
    vi.mocked(fetchMOISPopulation).mockRejectedValueOnce(new Error("MOIS fail"));
    vi.mocked(fetchMOISAgePopulation).mockRejectedValueOnce(new Error("MOIS fail"));

    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    expect(report).toBeDefined();
    expect(report.frontMatter).toBeDefined();
    expect(report.appendices).toBeDefined();

    // DART 추가 조회는 호출되지 않아야 함
    expect(fetchCorpInfo).not.toHaveBeenCalled();
    expect(fetchFinancials).not.toHaveBeenCalled();
  });

  // ── 6. searchCorpCode가 null을 반환하면 DART 추가 조회 스킵 ──
  it("법인코드 검색 실패 시 DART 재무 조회를 건너뛴다", async () => {
    vi.mocked(searchCorpCode).mockResolvedValueOnce(null);

    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    await generateScrReport(input);

    expect(fetchCorpInfo).not.toHaveBeenCalled();
    expect(fetchFinancials).not.toHaveBeenCalled();
  });

  // ── 7. 여러 문서의 extractedData 병합 ──
  it("여러 문서의 데이터를 올바르게 병합한다", async () => {
    const doc1 = createParsedDocWithClaims({
      site_address: "서울특별시 강남구 역삼동",
      revenue_apartment: 600000,
    });
    const doc2 = createParsedDocWithClaims({
      developer: "제2시행사",
      revenue_officetel: 150000,
    });

    const input: ScrReportInput = {
      parsedDocs: [doc1, doc2],
      projectType: "주상복합",
    };

    const report = await generateScrReport(input);

    expect(report.projectOverview.projectSummary.siteAddress).toBe(
      "서울특별시 강남구 역삼동"
    );
    expect(calculateBusinessIncome).toHaveBeenCalled();
  });

  // ── 8. 계산 엔진이 모두 호출되는지 확인 ──
  it("모든 계산 엔진이 정확히 1회씩 호출된다", async () => {
    const doc = createParsedDocWithClaims({
      site_address: "경기도 성남시 분당구 정자동",
      revenue_apartment: 500000,
      cost_land: 200000,
      pf_total: 300000,
      equity_amount: 50000,
    });

    const input: ScrReportInput = {
      parsedDocs: [doc],
      projectType: "아파트",
    };

    await generateScrReport(input);

    expect(calculateBusinessIncome).toHaveBeenCalledTimes(1);
    expect(calculateBep).toHaveBeenCalledTimes(1);
    expect(calculateDscr).toHaveBeenCalledTimes(1);
    expect(generateMonthlyCashflow).toHaveBeenCalledTimes(1);
    expect(calculateScenarios).toHaveBeenCalledTimes(1);
    expect(analyzeSensitivity).toHaveBeenCalledTimes(1);
    expect(forecastPrice).toHaveBeenCalledTimes(1);
  });

  // ── 9. 주소에서 시군구 추출 (extractDistrict 커버) ──
  it("서울특별시 강남구 주소에서 시군구를 정확히 추출한다", async () => {
    const doc = createParsedDocWithClaims({
      site_address: "서울특별시 강남구 역삼동 123-4",
    });

    const input: ScrReportInput = {
      parsedDocs: [doc],
      projectType: "아파트",
    };

    await generateScrReport(input);

    expect(getStaticMarketContext).toHaveBeenCalled();
    const callArg = vi.mocked(getStaticMarketContext).mock.calls[0][0];
    expect(callArg).toContain("강남구");
  });

  // ── 10. 주소 매칭 불가 시 슬라이스 폴백 ──
  it("패턴에 맞지 않는 주소면 처음 20자로 폴백한다", async () => {
    const doc = createParsedDocWithClaims({
      site_address: "미국 뉴욕시 맨해튼 5번가 100호 길이가 긴 주소 테스트",
    });

    const input: ScrReportInput = {
      parsedDocs: [doc],
      projectType: "오피스텔",
    };

    await generateScrReport(input);

    const callArg = vi.mocked(getStaticMarketContext).mock.calls[0][0];
    expect(callArg.length).toBeLessThanOrEqual(20);
  });

  // ── 11. 재건축 projectType 처리 ──
  it("재건축 프로젝트 타입이 시세예측에 올바르게 전달된다", async () => {
    const doc = createParsedDocWithClaims({
      site_address: "서울특별시 강남구 개포동",
      planned_sale_price: 5000,
    });

    const input: ScrReportInput = {
      parsedDocs: [doc],
      projectType: "재건축",
    };

    await generateScrReport(input);

    const forecastCall = vi.mocked(forecastPrice).mock.calls[0][0];
    expect(forecastCall.projectType).toBe("재건축");
  });

  // ── 12. 비재건축 projectType은 "신축"으로 전달 ──
  it("비재건축 프로젝트 타입은 신축으로 전달된다", async () => {
    const doc = createParsedDocWithClaims({
      site_address: "경기도 화성시 동탄2",
    });

    const input: ScrReportInput = {
      parsedDocs: [doc],
      projectType: "지식산업센터",
    };

    await generateScrReport(input);

    const forecastCall = vi.mocked(forecastPrice).mock.calls[0][0];
    expect(forecastCall.projectType).toBe("신축");
  });

  // ── 13. 기본 옵션 적용 (constructionMonths, scenarioSaleRates) ──
  it("options 미제공 시 기본값(48개월, 4시나리오)이 적용된다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    await generateScrReport(input);

    const cashflowCall = vi.mocked(generateMonthlyCashflow).mock.calls[0][0];
    expect(cashflowCall.constructionMonths).toBe(48);

    const scenarioCall = vi.mocked(calculateScenarios).mock.calls[0][0];
    expect(scenarioCall.scenarios.length).toBe(3);
  });

  // ── 14. repaymentAnalysis 구조 상세 검증 ──
  it("원리금상환분석이 올바른 구조를 갖춘다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);
    const repayment = report.repaymentAnalysis;

    // 기본 가정 문구
    expect(repayment.assumptions).toContain("차주가 제출한 사업계획서");

    // 사업수지 구조
    expect(repayment.businessIncome.revenue.total).toBe(1000000);
    expect(repayment.businessIncome.cost.total).toBe(800000);
    expect(repayment.businessIncome.profitBeforeTax).toBe(200000);

    // 자금수지 요약 (5행)
    expect(repayment.cashFlowSummary.length).toBe(5);
    expect(repayment.cashFlowSummary[0].item).toBe("분양수입 합계");

    // 월별 자금수지 3분할
    expect(repayment.monthlyCashFlow.part1.length).toBeGreaterThan(0);
    expect(repayment.monthlyCashFlow.part2.length).toBeGreaterThan(0);
    expect(repayment.monthlyCashFlow.part3.length).toBeGreaterThan(0);

    // BEP 3종 x 3조합
    expect(repayment.bep.pfRepaymentBep.length).toBe(3);
    expect(repayment.bep.totalCostBep.length).toBe(3);
    expect(repayment.bep.scenarioBep.length).toBe(3);
    expect(repayment.bep.scenarioBep[0].margin).toBe(20); // 100 - 80

    // 시나리오 분석
    expect(repayment.scenario.projections.length).toBe(4);
    expect(repayment.scenario.conditions.length).toBe(3);
  });

  // ── 15. 부록(appendices) 구조 검증 ──
  it("부록에 정책히스토리, 대출규제, 규제지역, HUG, 가격지수가 포함된다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);
    const appendices = report.appendices;

    expect(appendices.policyHistory.length).toBeGreaterThan(0);
    expect(appendices.policyHistory[0]).toHaveProperty("date");
    expect(appendices.policyHistory[0]).toHaveProperty("policy");

    expect(appendices.loanRegulations.length).toBeGreaterThan(0);

    expect(appendices.regulatedAreas.length).toBeGreaterThan(0);
    expect(appendices.regulatedAreas[0].areaType).toBe("투기과열지구");

    expect(appendices.hugAreas.length).toBe(1);
    expect(appendices.hugAreas[0].guaranteeType).toBe("고분양가 관리");
    expect(appendices.hugAreas[0].condition).toContain("3000");

    expect(appendices.priceIndexTrend.length).toBe(2);
  });

  // ── 16. 시장분석 규제지역 분기 커버 ──
  it("규제지역인 경우 규제지역 관련 메시지가 포함된다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    expect(report.marketAnalysis.regulations.summary).toContain("규제지역");
    expect(report.marketAnalysis.regulations.regulatedAreaType).toBe("투기과열지구");
    expect(report.marketAnalysis.regulations.subscriptionRestriction).toContain(
      "규제지역 청약 제한"
    );
  });

  // ── 17. 비규제지역 분기 커버 ──
  it("비규제지역인 경우 비규제 메시지가 포함된다", async () => {
    vi.mocked(getStaticMarketContext).mockReturnValueOnce({
      ...mockStaticMarket,
      regulationStatus: {
        isRegulated: false,
        regulations: [],
      },
      hugStatus: {
        isHighPrice: false,
        area: null,
      },
    });

    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    expect(report.marketAnalysis.regulations.summary).toContain("해제");
    expect(report.marketAnalysis.regulations.regulatedAreaType).toBeUndefined();
    expect(report.marketAnalysis.regulations.subscriptionRestriction).toContain(
      "비규제지역"
    );
    expect(report.appendices.hugAreas.length).toBe(0);
  });

  // ── 18. 개발사분석에 DART 재무데이터 반영 ──
  it("DART 재무데이터가 개발사분석에 반영된다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);
    const dev = report.developerAnalysis;

    expect(dev.companyOverview.companyName).toBe("테스트건설");
    expect(dev.companyOverview.ceoName).toBe("홍길동");

    expect(dev.profitability.length).toBe(1);
    expect(dev.profitability[0].year).toBe(2023);
    expect(dev.profitability[0].revenue).toBe(500000);

    expect(dev.financialStability.balanceSheet.length).toBe(1);
    expect(dev.financialStability.balanceSheet[0].totalAssets).toBe(1000000);
    // 600000 / 1000000 * 100 = 60
    expect(dev.financialStability.balanceSheet[0].debtRatio).toBe(60);
  });

  // ── 19. DART 데이터 없을 때 기본값 ──
  it("DART 법인정보가 없으면 기본값이 사용된다", async () => {
    vi.mocked(searchCorpCode).mockResolvedValueOnce(null);

    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    expect(report.developerAnalysis.companyOverview.companyName).toBe("미확인");
    expect(report.developerAnalysis.profitability.length).toBe(0);
    expect(report.developerAnalysis.financialStability.balanceSheet.length).toBe(0);
  });

  // ── 20. 분양가 적정성 검토 구조 확인 ──
  it("분양가 적정성 검토가 올바른 구조를 갖추고 있다", async () => {
    const doc = createParsedDocWithClaims({
      site_address: "서울특별시 강남구 역삼동",
      planned_sale_price: 2700,
    });

    const input: ScrReportInput = {
      parsedDocs: [doc],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);
    const price = report.priceAdequacy;

    expect(price.location).toHaveProperty("transportation");
    expect(price.location).toHaveProperty("livingInfra");

    expect(price.priceReview.regionalTrend.length).toBe(2);
    expect(price.priceReview.supplyCases.length).toBe(1);

    expect(price.adequacyOpinion.plannedPrice.length).toBe(1);
    expect(price.adequacyOpinion.comparison.length).toBe(1);
    expect(price.adequacyOpinion.conclusion).toContain("2,500");
    expect(price.adequacyOpinion.conclusion).toContain("적정");
  });

  // ── 21. totalRevenue가 0일 때 비율 폴백 ──
  it("totalRevenue가 0이면 비율에 기본값이 사용된다", async () => {
    vi.mocked(calculateBusinessIncome).mockReturnValueOnce({
      ...mockBusinessIncome,
      totalRevenue: 0,
      totalCost: 0,
    });

    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    await generateScrReport(input);

    const bepCall = vi.mocked(calculateBep).mock.calls[0][0];
    expect(bepCall.apartmentRevenueRatio).toBe(0.7);
    expect(bepCall.officetelRevenueRatio).toBe(0.15);
    expect(bepCall.commercialRevenueRatio).toBe(0.1);
  });

  // ── 22. salePriceIndex가 null인 경우 ──
  it("salePriceIndex가 null이어도 보고서를 생성한다", async () => {
    vi.mocked(fetchSalePriceIndex).mockResolvedValueOnce(null as never);

    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    expect(report).toBeDefined();
    expect(report.priceAdequacy.priceReview.regionalTrend.length).toBe(0);
  });

  // ── 23. 빈 parsedDocs 배열 ──
  it("빈 parsedDocs 배열로도 기본 보고서를 생성한다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    expect(report.frontMatter.projectName).toBe("미정");
    expect(report.projectOverview.projectSummary.siteAddress).toBe("주소 미상");
    expect(report.projectOverview.projectSummary.developer).toBe("시행사 미상");
    expect(report.projectOverview.projectSummary.constructor).toBe("시공사 미상");
  });

  // ── 24. 인구 데이터의 세대당 인구 계산 ──
  it("인구/세대 데이터에서 세대당 인구를 올바르게 계산한다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    const popHousehold = report.marketAnalysis.demographics.populationHousehold;
    expect(popHousehold.length).toBe(2);
    // 540000 / 230000 = 2.3478...
    expect(popHousehold[0].personsPerHousehold).toBeCloseTo(2.35, 1);
  });

  // ── 25. 시나리오명 매핑 검증 (mapScenarioName 커버) ──
  it("시나리오 projections에서 분양률 기반 시나리오명이 올바르게 매핑된다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    const projections = report.repaymentAnalysis.scenario.projections;

    // 차주안 (1000000/1000000 = 1.0) -> "기본"
    expect(projections[0].scenario).toBe("기본");
    // 시나리오1 (950000/1000000 = 0.95) -> "낙관"
    expect(projections[1].scenario).toBe("낙관");
    // 시나리오2 (900000/1000000 = 0.9) -> "보수"
    expect(projections[2].scenario).toBe("보수");
    // 시나리오3 (850000/1000000 = 0.85) -> "비관"
    expect(projections[3].scenario).toBe("비관");
  });

  // ── 26. debtRatio 계산 (totalAssets 0인 경우) ──
  it("totalAssets가 0이면 debtRatio가 0이 된다", async () => {
    vi.mocked(fetchFinancials).mockResolvedValueOnce({
      corpCode: "00000000",
      corpName: "테스트기업",
      incomeStatements: [],
      balanceSheets: [
        { year: 2023, totalAssets: 0, totalLiabilities: 0, totalEquity: 0, totalDebt: 0, debtRatio: 0 },
      ],
      dataSource: "fallback",
    });

    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    expect(
      report.developerAnalysis.financialStability.balanceSheet[0].debtRatio
    ).toBe(0);
  });

  // ── 27. 주택보급률 데이터가 null인 경우 ──
  it("housingSupply가 null이면 supplyRate가 빈 배열이 된다", async () => {
    vi.mocked(fetchHousingSupply).mockResolvedValueOnce(null as never);

    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    expect(report.marketAnalysis.housingMarket.supplyRate.length).toBe(0);
  });

  // ── 28. rentPriceIndex 매칭 (appendices priceIndexTrend) ──
  it("salePriceIndex와 rentPriceIndex가 yearMonth로 매칭된다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    const matched = report.appendices.priceIndexTrend.find(
      (t) => t.yearMonth === "2023-06"
    );
    expect(matched).toBeDefined();
    expect(matched!.apartmentIndex).toBe(102.5);
    expect(matched!.jeonseIndex).toBe(100.8);
  });

  // ── 29. 경기도 주소의 시군구 추출 ──
  it("경기도 성남시 분당구 주소에서 시군구를 추출한다", async () => {
    const doc = createParsedDocWithClaims({
      site_address: "경기도 성남시 분당구 정자동 100",
    });

    const input: ScrReportInput = {
      parsedDocs: [doc],
      projectType: "아파트",
    };

    await generateScrReport(input);

    const staticCall = vi.mocked(getStaticMarketContext).mock.calls[0][0];
    expect(staticCall).toContain("성남시");
  });

  // ── 30. 병렬 API 호출 확인 ──
  it("7개 외부 API를 병렬로 호출한다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    await generateScrReport(input);

    expect(fetchPopulationTrends).toHaveBeenCalledTimes(1);
    expect(fetchHousingSupply).toHaveBeenCalledTimes(1);
    expect(searchCorpCode).toHaveBeenCalledTimes(1);
    expect(fetchSalePriceIndex).toHaveBeenCalledTimes(1);
    expect(fetchRentPriceIndex).toHaveBeenCalledTimes(1);
    expect(fetchMOISPopulation).toHaveBeenCalledTimes(1);
    expect(fetchMOISAgePopulation).toHaveBeenCalledTimes(1);
  });

  // ── 31. 인근 분양사례 데이터 변환 ──
  it("인근 분양사례가 올바르게 변환된다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);
    const supplyCases = report.priceAdequacy.priceReview.supplyCases;

    expect(supplyCases.length).toBe(1);
    expect(supplyCases[0].complexName).toBe("테스트 아파트");
    expect(supplyCases[0].totalUnits).toBe(500);
    expect(supplyCases[0].saleRate).toBe(95);
    expect(supplyCases[0].salePricePerPyeong).toBe(Math.round(3000 * 3.3058));
    expect(supplyCases[0].note).toContain("경쟁률 15:1");
  });

  // ── 32. 월별 자금수지 -> ScrMonthlyRow 변환 ──
  it("MonthlyRow가 ScrMonthlyRow로 올바르게 변환된다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);
    const part1 = report.repaymentAnalysis.monthlyCashFlow.part1;

    expect(part1.length).toBeGreaterThan(0);
    const row = part1[0];
    expect(row.yearMonth).toBe("'26.01");
    expect(row.values["수입합계"]).toBe(10000);
    expect(row.values["지출합계"]).toBe(5000);
    expect(row.values["사업수지"]).toBe(5000);
    expect(row.values["현금잔액"]).toBe(5000);
  });

  // ── 33. gapRate 양수 -> conclusion에 + 기호 ──
  it("gapRate가 양수이면 conclusion에 + 기호가 포함된다", async () => {
    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    expect(report.priceAdequacy.adequacyOpinion.conclusion).toContain("+8%");
  });

  // ── 34. gapRate 음수인 경우 ──
  it("gapRate가 음수이면 conclusion에 - 기호가 포함된다", async () => {
    vi.mocked(forecastPrice).mockReturnValueOnce({
      ...mockPriceForecast,
      priceComparison: {
        plannedPrice: 2200,
        currentAvg: 2500,
        gapAmount: -300,
        gapRate: -12,
        assessment: "할인",
      },
    });

    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    expect(report.priceAdequacy.adequacyOpinion.conclusion).toContain("-12%");
    expect(report.priceAdequacy.adequacyOpinion.conclusion).not.toContain("+-12%");
  });

  // ── 35. households가 0인 경우 personsPerHousehold 0 처리 ──
  it("세대수가 0이면 세대당 인구가 0이 된다", async () => {
    vi.mocked(fetchPopulationTrends).mockResolvedValueOnce({
      region: "서울특별시 강남구",
      trends: [{ year: 2023, population: 100, households: 0, dataSource: "fallback" as const }],
      ageGroups: [],
      dataSource: "fallback",
    });

    const input: ScrReportInput = {
      parsedDocs: [createMinimalParsedDoc()],
      projectType: "아파트",
    };

    const report = await generateScrReport(input);

    expect(
      report.marketAnalysis.demographics.populationHousehold[0].personsPerHousehold
    ).toBe(0);
  });
});
