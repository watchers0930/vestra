/**
 * SCR 보고서 생성 모듈 통합 테스트
 *
 * 대상 모듈:
 *   - scr-report-html.ts     (전체 HTML 렌더링)
 *   - scr-report-tables.ts   (64개 표 렌더링)
 *   - scr-report-charts.ts   (23개 차트 SVG 렌더링)
 *   - scr-report-css.ts      (A4 보고서 CSS)
 *   - report-html.ts         (기존 FeasibilityReport HTML)
 *   - scr-report-cache.ts    (인메모리 캐시)
 *   - scr-parser-extensions.ts (확장 파싱 엔진)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { ScrReportData } from "@/lib/feasibility/scr-types";
import type { FeasibilityReport } from "@/lib/feasibility/feasibility-types";

// ─── 최소 ScrReportData 목 데이터 팩토리 ───

function createMinimalScrReportData(
  overrides?: Partial<ScrReportData>
): ScrReportData {
  return {
    frontMatter: {
      reportNumber: "SCR-2026-001",
      projectName: "테스트 아파트 사업",
      developer: "테스트 시행사",
      analyst: "AI 분석",
      date: "2026-05-01",
      disclaimer: "본 보고서는 테스트용입니다.",
    },
    projectOverview: {
      projectSummary: {
        projectName: "테스트 아파트",
        siteAddress: "서울시 강남구 역삼동 123-4",
        zoneDistrict: "제3종일반주거지역",
        constructor: "대한건설",
        developer: "테스트 시행사",
        totalLandArea: 5000,
        totalFloorArea: 30000,
        buildingCoverageRatio: 59.9,
        floorAreaRatio: 299.5,
        aboveFloors: 25,
        belowFloors: 3,
        buildingCount: 3,
        totalUnits: 300,
        purpose: "아파트",
        constructionPeriodMonths: 36,
      },
      structureDiagram: {
        buyer: "수분양자",
        developer: "테스트 시행사",
        lenders: ["A은행", "B은행"],
        trustCompany: "한국신탁",
        constructor: "대한건설",
      },
      schedule: [
        { milestone: "착공", plannedDate: "2026-01-01", status: "완료" },
        { milestone: "분양승인", plannedDate: "2026-03-01", status: "진행중" },
      ],
      salePlan: {
        excludingExpansion: [
          {
            type: "59A",
            units: 100,
            exclusiveArea: 59.99,
            supplyArea: 84.95,
            pricePerExclusivePyeong: 3200,
            pricePerSupplyPyeong: 2260,
            pricePerUnit: 58000,
            totalRevenue: 5800000,
            ratio: 40,
          },
        ],
        includingExpansion: [
          {
            type: "59A",
            units: 100,
            exclusiveArea: 59.99,
            supplyArea: 84.95,
            pricePerExclusivePyeong: 3500,
            pricePerSupplyPyeong: 2470,
            pricePerUnit: 63000,
            totalRevenue: 6300000,
            ratio: 40,
          },
        ],
      },
      paymentSchedule: [
        {
          stage: "계약금",
          percentage: 10,
          dueDate: "2026-04-01",
          amount: 5800,
        },
      ],
      fundingPlan: {
        existingPfAmount: 50000,
        newPfAmount: 30000,
        pfTotal: 80000,
        equityAmount: 20000,
        pfInterestRateExisting: 5.5,
        pfInterestRateNew: 6.0,
        pfMaturityMonths: 36,
        trustCompany: "한국신탁",
        lenders: ["A은행", "B은행"],
      },
      landStatus: [
        {
          parcel: "역삼동 123-4",
          landType: "사유지",
          area: 5000,
          pricePerPyeong: 2000,
          totalPrice: 3025000,
        },
      ],
    },
    developerAnalysis: {
      companyOverview: {
        companyName: "테스트 시행사",
        ceoName: "홍길동",
        establishedDate: "2010-01-01",
        employeeCount: 50,
        mainBusiness: "부동산 개발",
        address: "서울시 강남구",
        creditRating: "BBB+",
      },
      shareholders: [
        { name: "홍길동", shareCount: 50000, shareRatio: 50.0 },
        { name: "김철수", shareCount: 30000, shareRatio: 30.0 },
      ],
      ongoingProjects: [
        {
          projectName: "강남 프로젝트",
          location: "서울시 강남구",
          totalAmount: 500000,
          progress: 45,
          expectedCompletion: "2027-06-30",
        },
      ],
      orderBacklog: [
        { year: 2024, values: { 수주잔고: 120000 } },
        { year: 2025, values: { 수주잔고: 150000 } },
      ],
      profitability: [
        {
          year: 2024,
          revenue: 80000,
          costOfRevenue: 65000,
          grossProfit: 15000,
          sgaExpense: 3000,
          operatingProfit: 12000,
          ebitda: 14000,
          nonOperatingIncome: -1000,
          netIncome: 9000,
        },
        {
          year: 2025,
          revenue: 95000,
          costOfRevenue: 76000,
          grossProfit: 19000,
          sgaExpense: 3500,
          operatingProfit: 15500,
          ebitda: 17500,
          nonOperatingIncome: -800,
          netIncome: 12000,
        },
      ],
      financialStability: {
        balanceSheet: [
          {
            year: 2024,
            totalAssets: 200000,
            totalLiabilities: 120000,
            totalBorrowings: 80000,
            borrowingDependency: 40,
            debtRatio: 150,
            equity: 80000,
          },
        ],
        liquidity: [
          {
            year: 2024,
            currentAssets: 100000,
            currentLiabilities: 60000,
            currentRatio: 166.7,
            quickRatio: 120.5,
          },
        ],
        borrowingDetail: [
          {
            lender: "A은행",
            type: "장기차입금",
            amount: 50000,
            interestRate: 5.5,
            maturityDate: "2028-12-31",
          },
        ],
      },
      cashFlow: [
        {
          year: 2024,
          operating: 15000,
          investing: -8000,
          financing: -3000,
          netChange: 4000,
          endingBalance: 25000,
        },
        {
          year: 2025,
          operating: 18000,
          investing: -10000,
          financing: -2000,
          netChange: 6000,
          endingBalance: 31000,
        },
      ],
    },
    marketAnalysis: {
      regulations: {
        ltvRatio: 50,
        dtiRatio: 40,
        resaleRestrictionMonths: 36,
        subscriptionRestriction: "청약 1순위 제한",
        summary: "투기과열지구로 지정되어 LTV 50%, DTI 40% 규제가 적용됩니다.",
      },
      demographics: {
        populationHousehold: [
          { year: 2023, population: 500000, households: 200000, personsPerHousehold: 2.5 },
          { year: 2024, population: 510000, households: 210000, personsPerHousehold: 2.43 },
        ],
        ageDistribution: [
          { ageGroup: "20대", count: 80000, ratio: 16.0 },
          { ageGroup: "30대", count: 90000, ratio: 18.0 },
          { ageGroup: "40대", count: 85000, ratio: 17.0 },
        ],
        industryEmployment: [
          { industry: "서비스업", employeeCount: 120000, ratio: 48.0 },
          { industry: "제조업", employeeCount: 60000, ratio: 24.0 },
        ],
      },
      housingMarket: {
        supplyRate: [
          {
            year: 2023,
            supplyRate: 102.3,
            totalHousing: 210000,
            apartment: 150000,
            rowHouse: 30000,
            detached: 20000,
            other: 10000,
          },
        ],
        transactions: [
          { yearMonth: "2024-01", count: 3500, yoyChange: 5.2 },
          { yearMonth: "2024-02", count: 3800, yoyChange: 8.1 },
        ],
        housingDistribution: [
          { type: "아파트", count: 150000, ratio: 71.4 },
          { type: "연립/다세대", count: 30000, ratio: 14.3 },
        ],
        buildingAge: [
          { ageRange: "5년 이하", count: 30000, ratio: 14.3 },
          { ageRange: "6~10년", count: 35000, ratio: 16.7 },
        ],
        supplyByArea: [
          { areaRange: "60㎡ 이하", count: 50000, ratio: 23.8 },
          { areaRange: "60~85㎡", count: 80000, ratio: 38.1 },
        ],
        upcomingSupply: [
          {
            complexName: "역삼 푸르지오",
            location: "서울시 강남구",
            totalUnits: 500,
            moveInDate: "2027-06-30",
            constructor: "대우건설",
          },
        ],
        plannedSupply: [
          {
            complexName: "서초 래미안",
            location: "서울시 서초구",
            totalUnits: 800,
            moveInDate: "2028-03-31",
          },
        ],
        unsoldTrend: [
          { yearMonth: "2024-01", totalUnsold: 500, afterCompletion: 100 },
          { yearMonth: "2024-02", totalUnsold: 480, afterCompletion: 90 },
        ],
        unsoldComplexes: [
          {
            complexName: "송파 아파트",
            location: "서울시 송파구",
            totalUnits: 400,
            unsoldUnits: 50,
            unsoldRatio: 12.5,
          },
        ],
      },
    },
    priceAdequacy: {
      location: {
        transportation: [
          { item: "지하철 2호선 역삼역", distance: "도보 5분" },
        ],
        livingInfra: [
          { item: "이마트 역삼점", distance: "도보 10분" },
        ],
        education: [
          { item: "역삼초등학교", distance: "도보 3분" },
        ],
        summary: "역삼역 도보 5분 거리의 우수한 입지여건을 보유하고 있습니다.",
      },
      nearbyDevelopment: [
        {
          planName: "영동대로 복합개발",
          description: "복합환승센터 건설",
          impact: "긍정",
        },
      ],
      facilityOverview:
        "지하 3층~지상 25층, 3개동 총 300세대 규모의 아파트입니다.",
      priceReview: {
        regionalTrend: [
          { year: 2020, avgMarketPrice: 2800, avgSalePrice: 2500, premiumRate: 12.0 },
          { year: 2021, avgMarketPrice: 3000, avgSalePrice: 2700, premiumRate: 11.1 },
          { year: 2022, avgMarketPrice: 3200, avgSalePrice: 2900, premiumRate: 10.3 },
        ],
        salesCases: [
          {
            complexName: "래미안 역삼",
            address: "서울시 강남구 역삼동",
            exclusiveArea: 84.95,
            supplyArea: 114.56,
            transactionDate: "2025-12-01",
            transactionPrice: 150000,
            pricePerExclusivePyeong: 5830,
            pricePerSupplyPyeong: 4325,
            floor: 15,
            buildYear: 2020,
            distanceKm: 0.5,
          },
        ],
        supplyCases: [
          {
            complexName: "강남 센트럴",
            address: "서울시 강남구",
            developer: "테스트 시행",
            constructor: "삼성물산",
            totalUnits: 400,
            exclusiveArea: 59.99,
            supplyArea: 84.95,
            saleDate: "2025-06-01",
            salePricePerPyeong: 3100,
            currentMarketPrice: 3500,
            premiumRate: 12.9,
            saleRate: 95,
          },
        ],
        premiumAnalysis: [
          {
            complexName: "강남 센트럴",
            salePricePerPyeong: 3100,
            currentPricePerPyeong: 3500,
            premiumAmount: 400,
            premiumRate: 12.9,
          },
        ],
      },
      adequacyOpinion: {
        plannedPrice: [
          { type: "59A", pricePerPyeong: 3200, totalPrice: 58000 },
        ],
        comparison: [
          { target: "래미안 역삼", pricePerPyeong: 5830, gap: -2630, gapRate: -45.1 },
          { target: "강남 센트럴", pricePerPyeong: 3100, gap: 100, gapRate: 3.2 },
        ],
        conclusion:
          "본건의 분양가는 인근 시세 대비 적정 수준으로 판단됩니다.",
      },
    },
    repaymentAnalysis: {
      assumptions: "기본 분양률 80%, PF 금리 6.0% 가정",
      periodSaleRate: [
        { period: "분양~3개월", shortTermRate: 30, cumulativeRate: 30 },
        { period: "3~6개월", shortTermRate: 25, cumulativeRate: 55 },
      ],
      businessIncome: {
        revenue: {
          apartment: 14500000,
          officetel: 0,
          balconyExpansion: 500000,
          commercial: 0,
          interimInterest: 200000,
          vat: 0,
          total: 15200000,
        },
        cost: {
          land: 3025000,
          directConstruction: 7000000,
          indirectConstruction: 1500000,
          salesExpense: 500000,
          generalAdmin: 300000,
          tax: 200000,
          pfFee: 100000,
          pfInterest: 480000,
          interimInterest: 200000,
          total: 13305000,
        },
        profitBeforeTax: 1895000,
        profitRate: 12.5,
      },
      cashFlowSummary: [
        { item: "총 수입", amount: 15200000 },
        { item: "총 지출", amount: 13305000 },
      ],
      fundingScale: [
        { source: "PF 대출", amount: 80000, ratio: 80, note: "A은행 외" },
        { source: "자기자본", amount: 20000, ratio: 20 },
      ],
      monthlyCashFlow: {
        part1: [
          { yearMonth: "2026-01", values: { 수입: 100000, 지출: 80000, 잔액: 20000 } },
        ],
        part2: [
          { yearMonth: "2027-01", values: { 수입: 150000, 지출: 120000, 잔액: 50000 } },
        ],
        part3: [],
      },
      scenario: {
        conditions: [
          { scenario: "낙관", saleRate: 95, description: "분양률 95% 달성" },
          { scenario: "기본", saleRate: 80, description: "분양률 80% 달성" },
          { scenario: "보수", saleRate: 65, description: "분양률 65% 달성" },
          { scenario: "비관", saleRate: 50, description: "분양률 50% 달성" },
        ],
        projections: [
          {
            scenario: "낙관",
            totalRevenue: 18050000,
            totalCost: 13305000,
            profitBeforeTax: 4745000,
            profitRate: 26.3,
            repaymentPossible: true,
          },
          {
            scenario: "기본",
            totalRevenue: 15200000,
            totalCost: 13305000,
            profitBeforeTax: 1895000,
            profitRate: 12.5,
            repaymentPossible: true,
          },
          {
            scenario: "보수",
            totalRevenue: 12350000,
            totalCost: 13305000,
            profitBeforeTax: -955000,
            profitRate: -7.2,
            repaymentPossible: false,
          },
          {
            scenario: "비관",
            totalRevenue: 9500000,
            totalCost: 13305000,
            profitBeforeTax: -3805000,
            profitRate: -28.6,
            repaymentPossible: false,
          },
        ],
        sensitivity: [
          { variable: "분양가", changePercent: -5, profitImpact: -760000, profitRateImpact: -5.0 },
          { variable: "공사비", changePercent: 5, profitImpact: -425000, profitRateImpact: -2.8 },
        ],
      },
      bep: {
        pfRepaymentBep: [
          { type: "아파트", bepSaleRate: 52.7, bepUnits: 158 },
        ],
        totalCostBep: [
          { type: "아파트", bepSaleRate: 87.5, bepUnits: 263 },
        ],
        scenarioBep: [
          { scenario: "기본", bepSaleRate: 87.5, margin: -7.5 },
          { scenario: "낙관", bepSaleRate: 87.5, margin: 7.5 },
        ],
      },
    },
    appendices: {
      policyHistory: [
        { date: "2023-01-01", policy: "LTV 규제 강화", detail: "투기과열지구 LTV 40% 적용" },
        { date: "2024-01-01", policy: "DSR 규제", detail: "DSR 40% 규제 도입" },
      ],
      loanRegulations: [
        { category: "투기과열지구", condition: "9억 이하", ltv: 40, dti: 40 },
      ],
      regulatedAreas: [
        {
          areaType: "투기과열지구",
          regions: ["서울 강남구", "서울 서초구"],
          designationDate: "2020-06-17",
        },
      ],
      hugAreas: [
        { region: "서울시 전역", guaranteeType: "분양보증", condition: "HUG 기준 충족 시" },
      ],
      nearbyDevelopmentDetail: [
        {
          planName: "영동대로 복합개발",
          description: "복합환승센터",
          status: "진행중",
        },
      ],
      interestRateTrend: [
        { yearMonth: "2024-01", baseRate: 3.5, mortgageRate: 4.5 },
        { yearMonth: "2024-06", baseRate: 3.25, mortgageRate: 4.2 },
      ],
      priceIndexTrend: [
        { yearMonth: "2024-01", apartmentIndex: 105.2, jeonseIndex: 98.3 },
        { yearMonth: "2024-06", apartmentIndex: 106.1, jeonseIndex: 99.0 },
      ],
    },
    metadata: {
      version: "1.0.0",
      generatedAt: "2026-05-01T00:00:00.000Z",
      sourceFiles: ["test-doc.pdf"],
      disclaimer: "테스트 면책조항",
    },
    ...overrides,
  };
}

// ─── 최소 FeasibilityReport 목 데이터 팩토리 ───

function createMinimalFeasibilityReport(
  overrides?: Partial<FeasibilityReport>
): FeasibilityReport {
  return {
    id: "test-report-001",
    projectContext: {
      projectName: "테스트 사업",
      location: {
        address: "서울시 강남구 역삼동",
        district: "강남구",
        dongCode: "1168010100",
      },
      scale: {
        totalLandArea: 5000,
        totalFloorArea: 30000,
        floorAreaRatio: 299.5,
        buildingCoverage: 59.9,
        floors: { above: 25, below: 3 },
        totalUnits: 300,
      },
      purpose: "아파트",
      claims: [],
      conflicts: [],
      resolvedConflicts: [],
      sourceFiles: [],
    },
    verificationResults: [
      {
        claimKey: "planned_sale_price",
        claimLabel: "분양가",
        claimValue: 3200,
        claimUnit: "만원/평",
        benchmark: {
          value: 3000,
          source: "MOLIT 실거래가",
          sourceType: "molit",
          asOfDate: "2026-03-01",
        },
        deviation: 0.067,
        deviationPercent: 6.7,
      },
    ],
    rationalityItems: [
      {
        claimKey: "planned_sale_price",
        claimLabel: "분양가",
        grade: "OPTIMISTIC",
        deviation: 0.067,
        reasoning: "인근 실거래가 대비 6.7% 높게 책정",
        verificationSource: "MOLIT 실거래가",
      },
    ],
    chapters: [
      {
        chapterId: "I",
        title: "사업 개요",
        summary: "테스트 사업 개요입니다.",
        dataTable: [
          { label: "사업명", value: "테스트 사업", unit: "" },
          { label: "총 세대수", value: "300", unit: "세대" },
        ],
        verificationDetails: [
          {
            claim: "분양가",
            evidence: "3,200만원/평",
            grade: "OPTIMISTIC",
            reasoning: "인근 대비 6.7% 높음",
          },
        ],
        overallReview: "전반적으로 양호한 사업 구조입니다.",
        riskHighlight: false,
      },
    ],
    vScore: {
      score: 72,
      grade: "B",
      gradeLabel: "조건부적격",
      breakdown: [
        {
          category: "분양가 적정성",
          weight: 0.3,
          score: 70,
          grade: "OPTIMISTIC",
        },
      ],
      investmentOpinion: "조건부 투자 적격으로 판단됩니다.",
    },
    metadata: {
      version: "1.0",
      generatedAt: "2026-05-01T00:00:00.000Z",
      sourceFiles: ["test.pdf"],
      disclaimer: "본 보고서는 AI 분석 결과입니다.",
    },
    ...overrides,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. scr-report-css.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("scr-report-css (getScrReportCSS)", () => {
  it("CSS 문자열을 반환한다", async () => {
    const { getScrReportCSS } = await import("@/lib/feasibility/scr-report-css");
    const css = getScrReportCSS();
    expect(typeof css).toBe("string");
    expect(css.length).toBeGreaterThan(100);
  });

  it("필수 CSS 셀렉터를 포함한다", async () => {
    const { getScrReportCSS } = await import("@/lib/feasibility/scr-report-css");
    const css = getScrReportCSS();
    expect(css).toContain("@page");
    expect(css).toContain(".cover-page");
    expect(css).toContain(".scr-table");
    expect(css).toContain(".scr-figure");
    expect(css).toContain(".page-break");
    expect(css).toContain(".chapter-title");
    expect(css).toContain(".section-title");
    expect(css).toContain(".disclaimer-page");
    expect(css).toContain(".toc-page");
  });

  it("인쇄 미디어 쿼리를 포함한다", async () => {
    const { getScrReportCSS } = await import("@/lib/feasibility/scr-report-css");
    const css = getScrReportCSS();
    expect(css).toContain("@media print");
  });

  it("A4 페이지 크기가 설정되어 있다", async () => {
    const { getScrReportCSS } = await import("@/lib/feasibility/scr-report-css");
    const css = getScrReportCSS();
    expect(css).toContain("210mm 297mm");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. scr-report-tables.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("scr-report-tables (renderTable / renderAllTables)", () => {
  it("표1(사업개요)을 올바른 HTML 구조로 렌더링한다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    const html = renderTable(1, data);

    expect(html).toContain("표1: 사업개요");
    expect(html).toContain("<table");
    expect(html).toContain("<thead");
    expect(html).toContain("<tbody");
    expect(html).toContain("테스트 아파트");
    expect(html).toContain("서울시 강남구 역삼동 123-4");
    expect(html).toContain("대한건설");
  });

  it("표2(사업일정)에 마일스톤 데이터가 렌더링된다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    const html = renderTable(2, data);

    expect(html).toContain("표2: 사업일정");
    expect(html).toContain("착공");
    expect(html).toContain("분양승인");
    expect(html).toContain("완료");
    expect(html).toContain("진행중");
  });

  it("표3(타입별 분양가 - 확장비 미포함)에 분양가가 표시된다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    const html = renderTable(3, data);

    expect(html).toContain("표3:");
    expect(html).toContain("59A");
    expect(html).toContain("3,200"); // pricePerExclusivePyeong
  });

  it("표6(자금조달)에 PF 정보가 표시된다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    const html = renderTable(6, data);

    expect(html).toContain("표6: 자금조달 계획");
    expect(html).toContain("한국신탁");
    expect(html).toContain("A은행, B은행");
  });

  it("표8(회사개요)에 시행사 정보가 표시된다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    const html = renderTable(8, data);

    expect(html).toContain("표8:");
    expect(html).toContain("테스트 시행사");
    expect(html).toContain("홍길동");
    expect(html).toContain("BBB+");
  });

  it("표11(수주잔고)에 빈 배열이면 '데이터 없음'을 표시한다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    data.developerAnalysis.orderBacklog = [];
    const html = renderTable(11, data);

    expect(html).toContain("데이터 없음");
  });

  it("표11(수주잔고)에 데이터가 있으면 연도별 값을 표시한다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    const html = renderTable(11, data);

    expect(html).toContain("2024");
    expect(html).toContain("120,000");
  });

  it("표17(인구세대)에 인구 데이터가 표시된다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    const html = renderTable(17, data);

    expect(html).toContain("표17:");
    expect(html).toContain("500,000");
    expect(html).toContain("200,000");
    expect(html).toContain("2.50"); // personsPerHousehold
  });

  it("표30(입지여건)에 교통/생활인프라/교육 정보가 표시된다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    const html = renderTable(30, data);

    expect(html).toContain("표30: 입지여건 분석");
    expect(html).toContain("교통");
    expect(html).toContain("생활인프라");
    expect(html).toContain("교육");
    expect(html).toContain("지하철 2호선 역삼역");
    expect(html).toContain("도보 5분");
  });

  it("표30(입지여건)에 빈 항목이면 '-'을 표시한다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    data.priceAdequacy.location.transportation = [];
    data.priceAdequacy.location.livingInfra = [];
    data.priceAdequacy.location.education = [];
    const html = renderTable(30, data);

    expect(html).toContain("교통");
    expect(html).toContain('class="empty"');
  });

  it("표41(사업수지)에 수입/지출/세전이익이 표시된다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    const html = renderTable(41, data);

    expect(html).toContain("표41: 사업수지");
    expect(html).toContain("수입");
    expect(html).toContain("지출");
    expect(html).toContain("아파트");
    expect(html).toContain("토지비");
    expect(html).toContain("세전이익");
  });

  it("표44~46(월별 자금수지)에서 빈 파트는 '데이터 없음'을 표시한다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    // part3 is empty
    const html = renderTable(46, data);
    expect(html).toContain("데이터 없음");
  });

  it("표48(시나리오별 사업수지)에 4가지 시나리오가 표시된다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    const html = renderTable(48, data);

    expect(html).toContain("낙관");
    expect(html).toContain("기본");
    expect(html).toContain("보수");
    expect(html).toContain("비관");
    expect(html).toContain("가능");
    expect(html).toContain("불가");
  });

  it("미정의 표 번호는 주석을 반환한다", async () => {
    const { renderTable } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    const html = renderTable(999, data);

    expect(html).toContain("<!-- 표999: 미정의 -->");
  });

  it("renderAllTables로 장별 전체 표를 렌더링한다", async () => {
    const { renderAllTables } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();

    // Chapter 1: 표 1~7
    const ch1 = renderAllTables(1, data);
    expect(ch1).toContain("표1:");
    expect(ch1).toContain("표7:");

    // Chapter 2: 표 8~16
    const ch2 = renderAllTables(2, data);
    expect(ch2).toContain("표8:");
    expect(ch2).toContain("표16:");
  });

  it("부록 표(53~64)가 올바르게 렌더링된다", async () => {
    const { renderAllTables } = await import("@/lib/feasibility/scr-report-tables");
    const data = createMinimalScrReportData();
    const appendixHtml = renderAllTables("appendix", data);

    expect(appendixHtml).toContain("표53:");
    expect(appendixHtml).toContain("표55:");
    expect(appendixHtml).toContain("표59:");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. scr-report-charts.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("scr-report-charts (renderChart / renderAllCharts)", () => {
  it("그림1(사업구조도)에 관계도가 SVG로 렌더링된다", async () => {
    const { renderChart } = await import("@/lib/feasibility/scr-report-charts");
    const data = createMinimalScrReportData();
    const svg = renderChart(1, data);

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("그림1: 사업 구조도");
    expect(svg).toContain("수분양자");
    expect(svg).toContain("테스트 시행사");
    expect(svg).toContain("대한건설");
    expect(svg).toContain("한국신탁");
    expect(svg).toContain("대주단");
  });

  it("그림2(시세추이)가 라인차트로 렌더링된다", async () => {
    const { renderChart } = await import("@/lib/feasibility/scr-report-charts");
    const data = createMinimalScrReportData();
    const svg = renderChart(2, data);

    expect(svg).toContain("<svg");
    expect(svg).toContain("그림2:");
    expect(svg).toContain("<polyline");
    expect(svg).toContain("평균시세");
    expect(svg).toContain("평균분양가");
  });

  it("그림3(인구추이)가 바차트로 렌더링된다", async () => {
    const { renderChart } = await import("@/lib/feasibility/scr-report-charts");
    const data = createMinimalScrReportData();
    const svg = renderChart(3, data);

    expect(svg).toContain("<svg");
    expect(svg).toContain("그림3:");
    expect(svg).toContain("<rect");
    expect(svg).toContain("인구수");
  });

  it("그림7(주택유형)이 파이차트로 렌더링된다", async () => {
    const { renderChart } = await import("@/lib/feasibility/scr-report-charts");
    const data = createMinimalScrReportData();
    const svg = renderChart(7, data);

    expect(svg).toContain("<svg");
    expect(svg).toContain("그림7:");
    expect(svg).toContain("<path"); // 파이 슬라이스
    expect(svg).toContain("아파트");
  });

  it("그림10(미분양 추이)이 영역차트로 렌더링된다", async () => {
    const { renderChart } = await import("@/lib/feasibility/scr-report-charts");
    const data = createMinimalScrReportData();
    const svg = renderChart(10, data);

    expect(svg).toContain("<svg");
    expect(svg).toContain("그림10:");
    expect(svg).toContain("<polygon"); // 영역 차트
    expect(svg).toContain("총 미분양");
  });

  it("그림14(사업비구성)가 파이차트로 렌더링된다", async () => {
    const { renderChart } = await import("@/lib/feasibility/scr-report-charts");
    const data = createMinimalScrReportData();
    const svg = renderChart(14, data);

    expect(svg).toContain("그림14: 사업비 구성");
    expect(svg).toContain("<path");
    expect(svg).toContain("토지비");
    expect(svg).toContain("직접공사비");
  });

  it("그림15(매출 세분도)가 스택바차트로 렌더링된다", async () => {
    const { renderChart } = await import("@/lib/feasibility/scr-report-charts");
    const data = createMinimalScrReportData();
    const svg = renderChart(15, data);

    expect(svg).toContain("그림15: 매출 세분도");
    expect(svg).toContain("<rect");
    expect(svg).toContain("아파트");
  });

  it("그림21(금리추이) 데이터가 없으면 '데이터 없음'을 표시한다", async () => {
    const { renderChart } = await import("@/lib/feasibility/scr-report-charts");
    const data = createMinimalScrReportData();
    data.appendices.interestRateTrend = [];
    const svg = renderChart(21, data);

    expect(svg).toContain("데이터 없음");
    expect(svg).toContain("그림21:");
  });

  it("그림22(가격지수) 데이터가 없으면 '데이터 없음'을 표시한다", async () => {
    const { renderChart } = await import("@/lib/feasibility/scr-report-charts");
    const data = createMinimalScrReportData();
    data.appendices.priceIndexTrend = [];
    const svg = renderChart(22, data);

    expect(svg).toContain("데이터 없음");
  });

  it("미정의 차트 번호는 주석을 반환한다", async () => {
    const { renderChart } = await import("@/lib/feasibility/scr-report-charts");
    const data = createMinimalScrReportData();
    const html = renderChart(999, data);

    expect(html).toContain("<!-- 그림999: 미정의 -->");
  });

  it("renderAllCharts로 장별 차트를 일괄 렌더링한다", async () => {
    const { renderAllCharts } = await import("@/lib/feasibility/scr-report-charts");
    const data = createMinimalScrReportData();

    // Chapter 1 has chart 1
    const ch1 = renderAllCharts(1, data);
    expect(ch1).toContain("그림1:");

    // Chapter 3 has charts 3,4,5,6,7,8,9,10,11
    const ch3 = renderAllCharts(3, data);
    expect(ch3).toContain("그림3:");
    expect(ch3).toContain("그림7:");
    expect(ch3).toContain("그림10:");

    // Appendix has charts 21, 22
    const appx = renderAllCharts("appendix", data);
    expect(appx).toContain("그림21:");
    expect(appx).toContain("그림22:");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. scr-report-html.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("scr-report-html (renderScrReportHTML)", () => {
  it("완전한 HTML 문서를 반환한다", async () => {
    const { renderScrReportHTML } = await import("@/lib/feasibility/scr-report-html");
    const data = createMinimalScrReportData();
    const html = renderScrReportHTML(data);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html lang=\"ko\">");
    expect(html).toContain("</html>");
    expect(html).toContain("<head>");
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
  });

  it("표지에 사업명과 보고서 정보가 표시된다", async () => {
    const { renderScrReportHTML } = await import("@/lib/feasibility/scr-report-html");
    const data = createMinimalScrReportData();
    const html = renderScrReportHTML(data);

    expect(html).toContain("SCR 분석보고서");
    expect(html).toContain("테스트 아파트 사업");
    expect(html).toContain("SCR-2026-001");
    expect(html).toContain("테스트 시행사");
  });

  it("목차 섹션이 모두 포함된다", async () => {
    const { renderScrReportHTML } = await import("@/lib/feasibility/scr-report-html");
    const data = createMinimalScrReportData();
    const html = renderScrReportHTML(data);

    // 본문 목차
    expect(html).toContain("I. 사업개요");
    expect(html).toContain("II. 사업주체 분석");
    expect(html).toContain("III. 시장 환경 분석");
    expect(html).toContain("IV. 분양가 적정성 검토");
    expect(html).toContain("V. 원리금상환가능성 분석");
    // 표 목차
    expect(html).toContain("표 목차");
    // 그림 목차
    expect(html).toContain("그림 목차");
    // 부록 목차
    expect(html).toContain("부록 목차");
  });

  it("5개 장 본문이 모두 렌더링된다", async () => {
    const { renderScrReportHTML } = await import("@/lib/feasibility/scr-report-html");
    const data = createMinimalScrReportData();
    const html = renderScrReportHTML(data);

    expect(html).toContain("chapter-title\">I. 사업개요");
    expect(html).toContain("chapter-title\">II. 사업주체 분석");
    expect(html).toContain("chapter-title\">III. 시장 환경 분석");
    expect(html).toContain("chapter-title\">IV. 분양가 적정성 검토");
    expect(html).toContain("chapter-title\">V. 원리금상환가능성 분석");
  });

  it("부록이 렌더링된다", async () => {
    const { renderScrReportHTML } = await import("@/lib/feasibility/scr-report-html");
    const data = createMinimalScrReportData();
    const html = renderScrReportHTML(data);

    expect(html).toContain("appendix-title\">부록");
    expect(html).toContain("A. 부동산 정책 히스토리");
    expect(html).toContain("F. 금리 추이");
    expect(html).toContain("G. 부동산 가격지수 추이");
  });

  it("면책조항 페이지가 렌더링된다", async () => {
    const { renderScrReportHTML } = await import("@/lib/feasibility/scr-report-html");
    const data = createMinimalScrReportData();
    const html = renderScrReportHTML(data);

    expect(html).toContain("면책조항");
    expect(html).toContain("본 보고서는 테스트용입니다.");
  });

  it("<style> 태그에 CSS가 포함된다", async () => {
    const { renderScrReportHTML } = await import("@/lib/feasibility/scr-report-html");
    const data = createMinimalScrReportData();
    const html = renderScrReportHTML(data);

    expect(html).toContain("<style>");
    expect(html).toContain("@page");
    expect(html).toContain(".scr-table");
  });

  it("HTML 이스케이프가 적용된다 (XSS 방어)", async () => {
    const { renderScrReportHTML } = await import("@/lib/feasibility/scr-report-html");
    const data = createMinimalScrReportData();
    data.frontMatter.projectName = '<script>alert("xss")</script>';
    const html = renderScrReportHTML(data);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("body에 보고서번호 data 속성이 설정된다", async () => {
    const { renderScrReportHTML } = await import("@/lib/feasibility/scr-report-html");
    const data = createMinimalScrReportData();
    const html = renderScrReportHTML(data);

    expect(html).toContain('data-report-number="SCR-2026-001"');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. report-html.ts (기존 FeasibilityReport 렌더러)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("report-html (generateFeasibilityReportHtml / normalizeFeasibilityReport)", () => {
  it("완전한 HTML 보고서를 생성한다", async () => {
    const { generateFeasibilityReportHtml } = await import("@/lib/feasibility/report-html");
    const report = createMinimalFeasibilityReport();
    const html = generateFeasibilityReportHtml(report);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
    expect(html).toContain("사업성 분석 보고서");
    expect(html).toContain("테스트 사업");
  });

  it("V-Score와 등급이 표시된다", async () => {
    const { generateFeasibilityReportHtml } = await import("@/lib/feasibility/report-html");
    const report = createMinimalFeasibilityReport();
    const html = generateFeasibilityReportHtml(report);

    expect(html).toContain("72점");
    expect(html).toContain("B");
    expect(html).toContain("조건부적격");
    expect(html).toContain("조건부 투자 적격으로 판단됩니다.");
  });

  it("검증 결과 테이블이 렌더링된다", async () => {
    const { generateFeasibilityReportHtml } = await import("@/lib/feasibility/report-html");
    const report = createMinimalFeasibilityReport();
    const html = generateFeasibilityReportHtml(report);

    expect(html).toContain("주장-검증 결과");
    expect(html).toContain("분양가");
    expect(html).toContain("+6.7%");
    expect(html).toContain("MOLIT 실거래가");
  });

  it("합리성 등급 평가가 렌더링된다", async () => {
    const { generateFeasibilityReportHtml } = await import("@/lib/feasibility/report-html");
    const report = createMinimalFeasibilityReport();
    const html = generateFeasibilityReportHtml(report);

    expect(html).toContain("합리성 등급 평가");
    expect(html).toContain("낙관적"); // gradeLabel for OPTIMISTIC
  });

  it("장별 내용이 렌더링된다", async () => {
    const { generateFeasibilityReportHtml } = await import("@/lib/feasibility/report-html");
    const report = createMinimalFeasibilityReport();
    const html = generateFeasibilityReportHtml(report);

    expect(html).toContain("Chapter I. 사업 개요");
    expect(html).toContain("테스트 사업 개요입니다.");
    expect(html).toContain("전반적으로 양호한 사업 구조입니다.");
  });

  it("면책조항이 표시된다", async () => {
    const { generateFeasibilityReportHtml } = await import("@/lib/feasibility/report-html");
    const report = createMinimalFeasibilityReport();
    const html = generateFeasibilityReportHtml(report);

    expect(html).toContain("면책조항");
    expect(html).toContain("본 보고서는 AI 분석 결과입니다.");
  });

  it("normalizeFeasibilityReport가 불완전한 입력을 정규화한다", async () => {
    const { normalizeFeasibilityReport } = await import("@/lib/feasibility/report-html");

    // 최소한의 입력
    const result = normalizeFeasibilityReport({
      projectName: "최소 테스트",
      location: "서울시 강남구",
    });

    expect(result.id).toBe("preview");
    expect(result.projectContext.projectName).toBe("최소 테스트");
    expect(result.projectContext.location.address).toBe("서울시 강남구");
    expect(result.vScore.grade).toBe("F");
    expect(result.chapters).toEqual([]);
    expect(result.verificationResults).toEqual([]);
  });

  it("normalizeFeasibilityReport가 null 입력을 처리한다", async () => {
    const { normalizeFeasibilityReport } = await import("@/lib/feasibility/report-html");

    const result = normalizeFeasibilityReport(null);

    expect(result.id).toBe("preview");
    expect(result.projectContext.projectName).toBe("미지정 사업");
    expect(result.vScore.score).toBe(0);
  });

  it("normalizeFeasibilityReport가 verifications 필드도 매핑한다", async () => {
    const { normalizeFeasibilityReport } = await import("@/lib/feasibility/report-html");

    const result = normalizeFeasibilityReport({
      verifications: [
        {
          claimKey: "planned_sale_price",
          claimLabel: "분양가",
          claimValue: 3200,
          claimUnit: "만원/평",
          benchmark: { value: 3000, source: "test", sourceType: "molit", asOfDate: "2026-01-01" },
          deviation: 0.067,
          deviationPercent: 6.7,
        },
      ],
    });

    expect(result.verificationResults).toHaveLength(1);
    expect(result.verificationResults[0].claimLabel).toBe("분양가");
  });

  it("빈 보고서로도 HTML이 정상 생성된다 (크래시 없음)", async () => {
    const { generateFeasibilityReportHtml } = await import("@/lib/feasibility/report-html");
    const html = generateFeasibilityReportHtml({});

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("미지정 사업");
    expect(html).toContain("0점");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. scr-report-cache.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("scr-report-cache", () => {
  it("보고서를 캐시에 저장하고 조회한다", async () => {
    const { cacheReport, getCachedReport } = await import("@/lib/feasibility/scr-report-cache");
    const data = createMinimalScrReportData();

    cacheReport("test-id-001", data);
    const result = getCachedReport("test-id-001");

    expect(result).not.toBeNull();
    expect(result!.frontMatter.projectName).toBe("테스트 아파트 사업");
  });

  it("존재하지 않는 ID는 null을 반환한다", async () => {
    const { getCachedReport } = await import("@/lib/feasibility/scr-report-cache");
    const result = getCachedReport("nonexistent-id-" + Date.now());
    expect(result).toBeNull();
  });

  it("generateReportId가 UUID v4 형식의 문자열을 반환한다", async () => {
    const { generateReportId } = await import("@/lib/feasibility/scr-report-cache");
    const id = generateReportId();

    expect(typeof id).toBe("string");
    // UUID v4 format: 8-4-4-4-12 hex characters
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("동일 ID로 덮어쓰기하면 최신 데이터가 반환된다", async () => {
    const { cacheReport, getCachedReport } = await import("@/lib/feasibility/scr-report-cache");
    const data1 = createMinimalScrReportData();
    const data2 = createMinimalScrReportData();
    data2.frontMatter.projectName = "업데이트된 사업";

    cacheReport("overwrite-test", data1);
    cacheReport("overwrite-test", data2);

    const result = getCachedReport("overwrite-test");
    expect(result!.frontMatter.projectName).toBe("업데이트된 사업");
  });

  it("generateReportId가 매번 고유한 ID를 생성한다", async () => {
    const { generateReportId } = await import("@/lib/feasibility/scr-report-cache");
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(generateReportId());
    }
    expect(ids.size).toBe(50);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. scr-parser-extensions.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("scr-parser-extensions (parseScrDocument / scrParserUtils)", () => {
  it("사업 개요 텍스트에서 기본 항목을 추출한다", async () => {
    const { parseScrDocument } = await import("@/lib/feasibility/scr-parser-extensions");
    const text = `
      사업명: 강남 센트럴 파크 아파트
      소재지: 서울시 강남구 역삼동 123-4
      시행사: 대한개발
      시공사: 삼성물산
      대지면적 5,000 ㎡
      연면적 30,000 ㎡
      건폐율 59.9%
      용적률 299.5%
      지상 25층
      지하 3층
      총 세대수 300세대
      공사기간 36개월
    `;

    const result = parseScrDocument(text, "test.pdf");

    expect(result.claims.building_name?.context).toContain("강남 센트럴 파크 아파트");
    expect(result.claims.site_address?.context).toContain("서울시 강남구 역삼동");
    expect(result.claims.developer?.context).toContain("대한개발");
    // constructor 키가 Object.hasOwn으로 정상 추출되는지 확인
    expect(result.claims.constructor?.context).toContain("삼성물산");
    expect(result.claims.total_land_area?.value).toBe(5000);
    expect(result.claims.total_floor_area?.value).toBe(30000);
    expect(result.claims.building_coverage?.value).toBe(59.9);
    expect(result.claims.floor_area_ratio?.value).toBe(299.5);
    expect(result.claims.above_floors?.value).toBe(25);
    expect(result.claims.below_floors?.value).toBe(3);
    expect(result.claims.total_units?.value).toBe(300);
    expect(result.claims.construction_period_months?.value).toBe(36);
  });

  it("분양가/자금조달 텍스트에서 금액을 추출한다", async () => {
    const { parseScrDocument } = await import("@/lib/feasibility/scr-parser-extensions");
    const text = `
      분양가 3,200 만원
      총 분양수입 합계 15,200 만원
      기존 PF 금액 500 억원
      신규 PF 금액 300 억원
      PF 합계 800 억원
      자기자본 200 억원
      PF 금리 6.0%
      PF 만기 36개월
      신탁사: 한국신탁
    `;

    const result = parseScrDocument(text, "test.pdf");

    expect(result.claims.planned_sale_price?.value).toBe(3200);
    expect(result.claims.total_revenue?.value).toBe(15200);
    expect(result.claims.existing_pf_amount?.value).toBe(5000000); // 500 * 10000
    expect(result.claims.new_pf_amount?.value).toBe(3000000);
    expect(result.claims.pf_total?.value).toBe(8000000);
    expect(result.claims.equity_amount?.value).toBe(2000000);
    expect(result.claims.pf_interest_rate?.value).toBe(6.0);
    expect(result.claims.pf_maturity?.value).toBe(36);
    expect(result.claims.trust_company?.context).toContain("한국신탁");
  });

  it("사업수지 표 텍스트에서 수입/지출을 추출한다", async () => {
    const { parseScrDocument } = await import("@/lib/feasibility/scr-parser-extensions");
    const text = `
      아파트 분양수입 14,500,000
      발코니 확장비 500,000
      토지비 3,025,000
      직접 공사비 7,000,000
      간접 공사비 1,500,000
      세전 사업이익 1,895,000
      수익률 12.5 %
    `;

    const result = parseScrDocument(text, "test.pdf");

    expect(result.claims.revenue_apartment?.value).toBe(14500000);
    expect(result.claims.revenue_balcony?.value).toBe(500000);
    expect(result.claims.cost_land?.value).toBe(3025000);
    expect(result.claims.cost_direct_construction?.value).toBe(7000000);
    expect(result.claims.profit_before_tax?.value).toBe(1895000);
    expect(result.claims.profit_rate?.value).toBe(12.5);
  });

  it("빈 텍스트에서도 크래시 없이 결과를 반환한다", async () => {
    const { parseScrDocument } = await import("@/lib/feasibility/scr-parser-extensions");
    const result = parseScrDocument("", "empty.pdf");

    expect(result.claims).toBeDefined();
    expect(result.stats.extractedKeys).toBe(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.sections).toBeDefined();
  });

  it("섹션 그룹핑이 올바르게 수행된다", async () => {
    const { parseScrDocument } = await import("@/lib/feasibility/scr-parser-extensions");
    const text = `
      대지면적 5,000 ㎡
      총 공사비 700 억원
      PF 금리 5.5%
      토지비 302 억원
    `;

    const result = parseScrDocument(text, "test.pdf");

    expect(result.sections.사업개요.total_land_area).toBeDefined();
    expect(result.sections.공사비.total_construction_cost).toBeDefined();
    expect(result.sections.자금조달.pf_interest_rate).toBeDefined();
  });

  it("신뢰도 점수가 0~100 범위이다", async () => {
    const { parseScrDocument } = await import("@/lib/feasibility/scr-parser-extensions");

    // 풍부한 텍스트
    const richText = `
      사업명: 테스트 사업
      대지면적 5,000 ㎡
      연면적 30,000 ㎡
      총 세대수 300세대
      PF 합계 800 억원
      세전 사업이익 189 억원
      수익률 12.5%
      건폐율 59.9%
      용적률 299.5%
      지상 25층
      시행사: 대한개발
      시공사: 삼성물산
    `;
    const richResult = parseScrDocument(richText, "test.pdf");
    expect(richResult.confidence).toBeGreaterThanOrEqual(0);
    expect(richResult.confidence).toBeLessThanOrEqual(100);
    expect(richResult.stats.extractedKeys).toBeGreaterThan(5);

    // 빈 텍스트
    const emptyResult = parseScrDocument("", "test.pdf");
    expect(emptyResult.confidence).toBeGreaterThanOrEqual(0);
    expect(emptyResult.confidence).toBeLessThanOrEqual(100);
  });

  it("scrParserUtils.parseNumber가 쉼표를 제거하고 숫자를 반환한다", async () => {
    const { scrParserUtils } = await import("@/lib/feasibility/scr-parser-extensions");

    expect(scrParserUtils.parseNumber("3,200")).toBe(3200);
    expect(scrParserUtils.parseNumber("14,500,000")).toBe(14500000);
    expect(scrParserUtils.parseNumber("abc")).toBe(0);
    expect(scrParserUtils.parseNumber("")).toBe(0);
  });

  it("scrParserUtils.normalizeToManwon이 금액 단위를 변환한다", async () => {
    const { scrParserUtils } = await import("@/lib/feasibility/scr-parser-extensions");

    expect(scrParserUtils.normalizeToManwon(500, "억원")).toBe(5000000);
    expect(scrParserUtils.normalizeToManwon(100, "백만원")).toBe(10000);
    expect(scrParserUtils.normalizeToManwon(50, "천만원")).toBe(50000);
    expect(scrParserUtils.normalizeToManwon(10000, "원")).toBe(1);
    expect(scrParserUtils.normalizeToManwon(3200, "만원")).toBe(3200);
    expect(scrParserUtils.normalizeToManwon(1, "조원")).toBe(100000000);
  });

  it("scrParserUtils.parseComplexAmount가 복합 금액을 파싱한다", async () => {
    const { scrParserUtils } = await import("@/lib/feasibility/scr-parser-extensions");

    // 조+억 패턴
    const result1 = scrParserUtils.parseComplexAmount("1조 2,345억원");
    expect(result1).not.toBeNull();
    expect(result1!.unit).toBe("만원");

    // 억+천만 패턴
    const result2 = scrParserUtils.parseComplexAmount("5억 3천만원");
    expect(result2).not.toBeNull();
    expect(result2!.value).toBe(53000);

    // 일반 금액
    const result3 = scrParserUtils.parseComplexAmount("800억원");
    expect(result3).not.toBeNull();
    expect(result3!.value).toBe(8000000);

    // 매칭 안됨
    const result4 = scrParserUtils.parseComplexAmount("hello world");
    expect(result4).toBeNull();
  });

  it("scrParserUtils.pyeongToSqm이 평을 제곱미터로 변환한다", async () => {
    const { scrParserUtils } = await import("@/lib/feasibility/scr-parser-extensions");

    expect(scrParserUtils.pyeongToSqm(1)).toBeCloseTo(3.31, 1);
    expect(scrParserUtils.pyeongToSqm(300)).toBeCloseTo(991.74, 1);
    expect(scrParserUtils.pyeongToSqm(0)).toBe(0);
  });

  it("scrParserUtils.normalizeScrText가 특수문자/전각 문자를 정규화한다", async () => {
    const { scrParserUtils } = await import("@/lib/feasibility/scr-parser-extensions");

    const normalized = scrParserUtils.normalizeScrText("사\u00a0업\u00a0명：테스트");
    expect(normalized).toContain("사업명:테스트");
  });

  it("scrParserUtils.parseTableRow가 탭/공백 구분 행을 파싱한다", async () => {
    const { scrParserUtils } = await import("@/lib/feasibility/scr-parser-extensions");

    // 탭 구분
    const tabRow = scrParserUtils.parseTableRow("항목\t값\t단위");
    expect(tabRow).toEqual(["항목", "값", "단위"]);

    // 공백 구분
    const spaceRow = scrParserUtils.parseTableRow("항목  값  단위");
    expect(spaceRow).toEqual(["항목", "값", "단위"]);
  });

  it("scrParserUtils.extractLabelValue가 라벨:값 패턴을 추출한다", async () => {
    const { scrParserUtils } = await import("@/lib/feasibility/scr-parser-extensions");

    const result = scrParserUtils.extractLabelValue(
      "사업명: 강남 아파트",
      /사업명:\s*(.+)/
    );
    expect(result).toBe("강남 아파트");

    const noMatch = scrParserUtils.extractLabelValue(
      "다른 텍스트",
      /사업명:\s*(.+)/
    );
    expect(noMatch).toBeNull();
  });

  it("기간별 분양률 패턴을 추출한다", async () => {
    const { parseScrDocument } = await import("@/lib/feasibility/scr-parser-extensions");
    const text = `
      분양~3개월  30.0%  30.0%
      3~6개월  25.0%  55.0%
    `;

    const result = parseScrDocument(text, "test.pdf");
    const periodData = result.claims.period_sale_rate;

    if (periodData) {
      expect(periodData.unit).toBe("JSON");
      expect(periodData.value).toBeGreaterThanOrEqual(1);
      const parsed = JSON.parse(periodData.context!);
      expect(parsed.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("타입별 분양가 패턴을 추출한다", async () => {
    const { parseScrDocument } = await import("@/lib/feasibility/scr-parser-extensions");
    const text = `
      59A  100  59.99  84.95  3200
      84B  200  84.95  114.56  2800
    `;

    const result = parseScrDocument(text, "test.pdf");
    const typeDetail = result.claims.sale_type_detail;

    if (typeDetail) {
      expect(typeDetail.unit).toBe("JSON");
      expect(typeDetail.value).toBe(2);
      const parsed = JSON.parse(typeDetail.context!);
      expect(parsed[0].type).toBe("59A");
      expect(parsed[1].type).toBe("84B");
    }
  });

  it("stats.extractionRate가 올바르게 계산된다", async () => {
    const { parseScrDocument } = await import("@/lib/feasibility/scr-parser-extensions");
    const text = "대지면적 5,000 ㎡ 연면적 30,000 ㎡";
    const result = parseScrDocument(text, "test.pdf");

    expect(result.stats.totalKeys).toBeGreaterThan(0);
    expect(result.stats.extractedKeys).toBeGreaterThanOrEqual(2);
    expect(result.stats.extractionRate).toBeCloseTo(
      (result.stats.extractedKeys / result.stats.totalKeys) * 100,
      1
    );
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. scr-types.ts (타입 가드)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("scr-types (isScrReportData)", () => {
  it("올바른 ScrReportData 객체를 인식한다", async () => {
    const { isScrReportData } = await import("@/lib/feasibility/scr-types");
    const data = createMinimalScrReportData();
    expect(isScrReportData(data)).toBe(true);
  });

  it("null/undefined/문자열은 false를 반환한다", async () => {
    const { isScrReportData } = await import("@/lib/feasibility/scr-types");
    expect(isScrReportData(null)).toBe(false);
    expect(isScrReportData(undefined)).toBe(false);
    expect(isScrReportData("string")).toBe(false);
    expect(isScrReportData(42)).toBe(false);
  });

  it("필수 필드가 없는 객체는 false를 반환한다", async () => {
    const { isScrReportData } = await import("@/lib/feasibility/scr-types");
    expect(isScrReportData({ frontMatter: {} })).toBe(false);
    expect(isScrReportData({ frontMatter: {}, projectOverview: {} })).toBe(false);
    expect(isScrReportData({ frontMatter: {}, projectOverview: {}, metadata: {} })).toBe(true);
  });
});
