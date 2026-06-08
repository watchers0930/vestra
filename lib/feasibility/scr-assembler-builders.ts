/**
 * SCR 보고서 섹션별 조립 함수 (II~V장 + 부록)
 *
 * @module lib/feasibility/scr-assembler-builders
 */

import type {
  ScrDeveloperAnalysis,
  ScrMarketAnalysis,
  ScrPriceAdequacy,
  ScrRepaymentAnalysis,
  ScrAppendices,
  ScrBusinessIncome,
  ScrScenarioAnalysis,
  ScrBepAnalysis,
  ScrPeriodSaleRateRow,
  ScrFundingScaleRow,
  MonthlyRow as ScrMonthlyRow,
  ProjectType,
} from "./scr-types";
import type { ExternalApiData, CalcResults } from "./scr-assembler";
import type { SupplyCaseEntry } from "./static-data";
import { getNearbySupplyCases } from "./static-data";
import type { PriceForecastResult } from "./calc";
import type { ParsedDocument } from "./feasibility-types";
import type { ScrClaimKey } from "./scr-claim-keys";
import {
  generateFallbackDeveloper,
  generateFallbackPopulation,
  generateFallbackAgeDistribution,
  generateFallbackHousingSupply,
  generateFallbackUnsoldTrend,
  generateFallbackTransactions,
  generateFallbackHousingDistribution,
  generateFallbackInterestRate,
  generateFallbackPriceIndex,
} from "./scr-fallback-data";

// ─── 로컬 헬퍼 (순환 import 방지) ───

function localGetClaimValue(
  parsedDocs: ParsedDocument[],
  key: ScrClaimKey
): number {
  for (const doc of parsedDocs) {
    const extracted = doc.extractedData[key];
    if (extracted && typeof extracted.value === "number") return extracted.value;
  }
  return 0;
}

function localGetClaimJson<T>(
  parsedDocs: ParsedDocument[],
  key: ScrClaimKey
): T | null {
  for (const doc of parsedDocs) {
    const extracted = doc.extractedData[key];
    if (extracted?.context) {
      try {
        return JSON.parse(extracted.context) as T;
      } catch {
        /* skip */
      }
    }
  }
  return null;
}

// ─── II. 시행사 분석 ───

export function buildDeveloperAnalysis(
  apiData: ExternalApiData,
  companyName: string = "",
  narrative?: string,
  projectName?: string,
  projectAddress?: string
): ScrDeveloperAnalysis {
  const corp = apiData.corpInfo;
  const fin = apiData.financials;

  // 폴백: API 데이터 없으면 중견 건설사 평균 재무구조 생성
  const fb = (!fin || fin.incomeStatements.length === 0)
    ? generateFallbackDeveloper(companyName || corp?.corpName || "")
    : null;

  const incomeStmts = fin?.incomeStatements.length
    ? fin.incomeStatements
    : (fb?.incomeStatements || []);
  const balSheets = fin?.balanceSheets.length
    ? fin.balanceSheets
    : (fb?.balanceSheets || []);

  return {
    companyOverview: {
      companyName: corp?.corpName || fb?.corpName || companyName || "미확인",
      ceoName: corp?.ceoName || "",
      establishedDate: corp?.establishDate || "",
      employeeCount: 0,
      mainBusiness: "부동산개발",
      address: "",
      creditRating: undefined,
    },
    shareholders: [],
    ongoingProjects: projectName
      ? [
          {
            projectName: projectName,
            location: projectAddress || "",
            totalAmount: 0,
            progress: 0,
            expectedCompletion: "",
          },
        ]
      : [],
    orderBacklog: [],
    profitability: incomeStmts.map((is) => ({
      year: is.year,
      revenue: is.revenue,
      costOfRevenue: is.costOfSales,
      grossProfit: is.grossProfit,
      sgaExpense: is.revenue - is.costOfSales - is.operatingProfit,
      operatingProfit: is.operatingProfit,
      ebitda: is.ebitda,
      nonOperatingIncome: 0,
      netIncome: is.netIncome,
    })),
    financialStability: {
      balanceSheet: balSheets.map((bs) => {
        const totalDebt = "totalDebt" in bs ? (bs as { totalDebt: number }).totalDebt : Math.round(bs.totalLiabilities * 0.6);
        const equity = "totalEquity" in bs ? (bs as { totalEquity: number }).totalEquity : bs.totalAssets - bs.totalLiabilities;
        return {
          year: bs.year,
          totalAssets: bs.totalAssets,
          totalLiabilities: bs.totalLiabilities,
          totalBorrowings: totalDebt,
          borrowingDependency:
            bs.totalAssets > 0
              ? Math.round((totalDebt / bs.totalAssets) * 10000) / 100
              : 0,
          debtRatio:
            bs.totalAssets > 0
              ? Math.round(
                  (bs.totalLiabilities / bs.totalAssets) * 10000
                ) / 100
              : 0,
          equity,
        };
      }),
      liquidity: balSheets.map((bs) => {
        // 유동자산/유동부채 추정 (상세 데이터 미제공 시 비율 추정)
        const currentAssets = Math.round(bs.totalAssets * 0.4);
        const currentLiabilities = Math.round(bs.totalLiabilities * 0.5);
        return {
          year: bs.year,
          currentAssets,
          currentLiabilities,
          currentRatio:
            currentLiabilities > 0
              ? Math.round((currentAssets / currentLiabilities) * 100) / 100
              : 0,
          quickRatio:
            currentLiabilities > 0
              ? Math.round(((currentAssets * 0.8) / currentLiabilities) * 100) / 100
              : 0,
        };
      }),
      borrowingDetail: [],
    },
    cashFlow: (fb?.cashFlow || []).map((cf) => {
      const netChange = cf.operating + cf.investing + cf.financing;
      return {
        year: cf.year,
        operating: cf.operating,
        investing: cf.investing,
        financing: cf.financing,
        netChange,
        endingBalance: netChange,
      };
    }),
    analysisNarrative: narrative,
  };
}

// ─── III. 시장 분석 ───

export function buildMarketAnalysis(
  apiData: ExternalApiData,
  district: string = "",
  demographicNarrative?: string,
  housingNarrative?: string
): ScrMarketAnalysis {
  const { staticMarket } = apiData;
  const loanRegs = staticMarket.loanRegulations;

  const ltvRatio = loanRegs.ltv[0]?.ratio || 70;
  const dtiRatio = loanRegs.dti[0]?.ratio || 60;
  const dsrRatio = loanRegs.dsr[0]?.ratio || 40;

  // 폴백: API 데이터 없으면 지역 기반 추정치 생성
  const popTrends = apiData.populationTrends?.trends
    || generateFallbackPopulation(district).trends;
  const moisAge = apiData.moisAge?.ageGroups
    || generateFallbackAgeDistribution(district).ageGroups;
  const housingSupply = apiData.housingSupply?.trends
    || generateFallbackHousingSupply(district).trends;
  const unsoldData = generateFallbackUnsoldTrend(district);
  const txData = generateFallbackTransactions(district);
  const distData = generateFallbackHousingDistribution(district);

  // 인근 분양사례에서 공급 정보 추출
  const nearbySupply = getNearbySupplyCases(district, 10);
  const now = new Date();

  // 입주예정 물량 (분양완료 단지)
  const upcomingSupply = nearbySupply
    .filter((sc) => {
      const supplyDate = new Date(sc.supplyDate + "-01");
      // 분양 후 2~3년 내 입주 예정
      const moveInDate = new Date(supplyDate);
      moveInDate.setFullYear(moveInDate.getFullYear() + 3);
      return moveInDate > now;
    })
    .slice(0, 5)
    .map((sc) => {
      const supplyDate = new Date(sc.supplyDate + "-01");
      const moveIn = new Date(supplyDate);
      moveIn.setFullYear(moveIn.getFullYear() + 3);
      return {
        complexName: sc.name,
        location: sc.address,
        totalUnits: sc.units,
        moveInDate: moveIn.toISOString().slice(0, 7),
        developer: "",
        constructor: "",
      };
    });

  // 분양예정 물량 — 최근 분양 단지로 근사
  const plannedSupply = nearbySupply
    .filter((sc) => {
      const supplyDate = new Date(sc.supplyDate + "-01");
      return supplyDate > now || (now.getTime() - supplyDate.getTime()) < 180 * 86400000;
    })
    .slice(0, 5)
    .map((sc) => ({
      complexName: sc.name,
      location: sc.address,
      totalUnits: sc.units,
      moveInDate: sc.supplyDate,
      developer: "",
      constructor: "",
    }));

  // 미분양 단지 — 미분양 추이에서 폴백 생성
  const latestUnsold = unsoldData.trends.at(-1);
  const unsoldComplexes = latestUnsold && latestUnsold.totalUnsold > 0
    ? [{
        complexName: `${district} 지역 미분양`,
        location: district,
        totalUnits: Math.round(latestUnsold.totalUnsold * 3),
        unsoldUnits: latestUnsold.totalUnsold,
        unsoldRatio: Math.round((latestUnsold.totalUnsold / Math.max(1, latestUnsold.totalUnsold * 3)) * 100),
        completionDate: latestUnsold.yearMonth,
      }]
    : [];

  // 면적별 분포 표준 생성
  const supplyByArea = [
    { areaRange: "60㎡ 이하", count: 0, ratio: 15 },
    { areaRange: "60~85㎡", count: 0, ratio: 45 },
    { areaRange: "85~102㎡", count: 0, ratio: 25 },
    { areaRange: "102~135㎡", count: 0, ratio: 12 },
    { areaRange: "135㎡ 초과", count: 0, ratio: 3 },
  ];

  return {
    regulations: {
      ltvRatio,
      dtiRatio,
      dsrRatio,
      resaleRestrictionMonths: 0,
      subscriptionRestriction: staticMarket.regulationStatus.isRegulated
        ? "규제지역 청약 제한 적용"
        : "비규제지역 (청약 제한 없음)",
      regulatedAreaType: staticMarket.regulationStatus.isRegulated
        ? staticMarket.regulationStatus.regulations[0]?.type
        : undefined,
      summary: staticMarket.regulationStatus.isRegulated
        ? "현재 규제지역으로 지정되어 있습니다."
        : "현재 규제지역 해제 상태입니다.",
    },
    demographics: {
      populationHousehold: popTrends.map((t) => ({
        year: t.year,
        population: t.population,
        households: t.households,
        personsPerHousehold:
          t.households > 0
            ? Math.round((t.population / t.households) * 100) / 100
            : 0,
      })),
      ageDistribution: moisAge.map((ag) => ({
        ageGroup: ag.ageGroup,
        count: ag.total,
        ratio: 0,
      })),
      industryEmployment: [],
    },
    housingMarket: {
      supplyRate: housingSupply.map((t) => ({
        year: t.year,
        supplyRate: t.supplyRate,
        totalHousing: t.totalHousing,
        apartment: 0,
        rowHouse: 0,
        detached: 0,
        other: 0,
      })),
      transactions: txData.transactions.map((t) => ({
        yearMonth: `${t.year}-01`,
        count: t.volume,
        yoyChange: t.yoyChange,
      })),
      housingDistribution: distData.housingDistribution.map((d) => ({
        type: d.type,
        count: 0,
        ratio: d.ratio,
      })),
      buildingAge: distData.buildingAge.map((d) => ({
        ageRange: d.range,
        count: 0,
        ratio: d.ratio,
      })),
      supplyByArea,
      upcomingSupply,
      plannedSupply,
      unsoldTrend: unsoldData.trends.map((t) => ({
        yearMonth: t.yearMonth,
        totalUnsold: t.totalUnsold,
        afterCompletion: t.postCompletionUnsold,
      })),
      unsoldComplexes,
    },
    demographicNarrative,
    housingNarrative,
  };
}

// ─── IV. 분양가 적정성 ───

export function buildPriceAdequacy(
  priceForecast: PriceForecastResult,
  apiData: ExternalApiData,
  plannedPrice: number,
  address: string = "",
  locationNarrative?: string,
  priceConclusion?: string,
  totalUnits?: number,
  projectType?: ProjectType
): ScrPriceAdequacy {
  const comp = priceForecast.priceComparison;

  // 입지여건 기본 템플릿 (주소 기반)
  const district = address.split(" ").slice(0, 2).join(" ");
  const location = {
    transportation: [
      { item: "지하철역", distance: "도보 10분 이내", note: "최근접 역 기준" },
      { item: "버스정류장", distance: "도보 3분 이내" },
      { item: "광역도로", distance: "차량 5분 이내" },
    ],
    livingInfra: [
      { item: "대형마트/쇼핑", distance: "차량 5~10분" },
      { item: "종합병원", distance: "차량 10분 이내" },
      { item: "공원/녹지", distance: "도보 5분 이내" },
    ],
    education: [
      { item: "초등학교", distance: "도보 5~10분" },
      { item: "중학교", distance: "도보 10분 이내" },
      { item: "고등학교", distance: "도보 15분 이내" },
    ],
    summary: `${district} 소재 본 사업지는 대중교통 접근성 및 생활 인프라가 양호한 입지입니다.`,
  };

  // 인근 개발 계획 — 정적 정책 데이터에서 추출
  const policies = apiData.staticMarket.recentPolicies.slice(0, 3);
  const nearbyDevelopment = policies.length > 0
    ? policies.map((p) => ({
        planName: p.title,
        description: p.description,
        expectedCompletion: undefined,
        impact: "중립" as const,
      }))
    : [
        {
          planName: "GTX/광역교통망 확충",
          description: "광역교통 개선으로 접근성 향상 기대",
          expectedCompletion: undefined,
          impact: "긍정" as const,
        },
        {
          planName: "주변 재개발/재건축 추진",
          description: "인근 정비사업 추진에 따른 주거환경 개선 예상",
          expectedCompletion: undefined,
          impact: "긍정" as const,
        },
      ];

  // 시설개요 텍스트 생성
  const typeLabel = projectType === "아파트" ? "아파트"
    : projectType === "오피스텔" ? "오피스텔"
    : projectType === "주상복합" ? "주상복합"
    : "공동주택";
  const facilityOverview =
    `본 사업은 ${district}에 위치한 ${typeLabel} ${totalUnits ? `총 ${totalUnits.toLocaleString()}세대` : ""} 규모의 ` +
    `주거시설 개발사업으로, 지역 주택 수요 및 입지여건을 고려한 상품 기획이 이루어졌습니다.`;

  // 공급사례에서 프리미엄 분석 생성
  const supplyCases = getNearbySupplyCases(address, 8).map(
    (sc: SupplyCaseEntry) => ({
      complexName: sc.name,
      address: sc.address,
      developer: "",
      constructor: "",
      totalUnits: sc.units,
      exclusiveArea: 0,
      supplyArea: 0,
      saleDate: sc.supplyDate,
      salePricePerPyeong: Math.round(sc.pricePerSqm * 3.3058),
      currentMarketPrice: undefined,
      premiumRate: undefined,
      saleRate: sc.saleRate,
      note: `${sc.projectType} / 경쟁률 ${sc.competitionRate}:1`,
    })
  );

  // 프리미엄 분석: 분양가 대비 현재 시세 추정
  const premiumAnalysis = supplyCases
    .filter((sc) => sc.salePricePerPyeong > 0)
    .slice(0, 5)
    .map((sc) => {
      // 분양 이후 시세 상승률 추정 (연 3~5%)
      const saleYear = parseInt(sc.saleDate.split("-")[0], 10) || new Date().getFullYear();
      const yearsDiff = Math.max(0, new Date().getFullYear() - saleYear);
      const appreciation = 1 + yearsDiff * 0.04;
      const estimatedCurrent = Math.round(sc.salePricePerPyeong * appreciation);
      const premiumAmount = estimatedCurrent - sc.salePricePerPyeong;
      return {
        complexName: sc.complexName,
        salePricePerPyeong: sc.salePricePerPyeong,
        currentPricePerPyeong: estimatedCurrent,
        premiumAmount,
        premiumRate:
          sc.salePricePerPyeong > 0
            ? Math.round((premiumAmount / sc.salePricePerPyeong) * 1000) / 10
            : 0,
      };
    });

  // 지역 시세 추이 — 가격지수를 실제 가격으로 환산
  const regionalTrend =
    apiData.salePriceIndex?.indices.map((idx) => {
      const year = parseInt(idx.yearMonth.split("-")[0], 10);
      // 지수 기반 환산: index=100 기준으로 plannedPrice에 비례
      const avgMarketPrice = Math.round(idx.index * plannedPrice / 100);
      return {
        year,
        avgMarketPrice,
        avgSalePrice: plannedPrice,
        premiumRate:
          avgMarketPrice > 0
            ? Math.round(((plannedPrice - avgMarketPrice) / avgMarketPrice) * 1000) / 10
            : 0,
      };
    }) || [];

  // ── MOLIT 실거래가 → salesCases 매핑 ──
  const rawTx = apiData.salesTransactions?.transactions ?? [];
  // 동일 단지(aptName)별 최신 1건만 추출, 최대 8건
  const deduped = new Map<string, typeof rawTx[0]>();
  for (const tx of rawTx) {
    const existing = deduped.get(tx.aptName);
    if (
      !existing ||
      tx.dealYear > existing.dealYear ||
      (tx.dealYear === existing.dealYear && tx.dealMonth > existing.dealMonth)
    ) {
      deduped.set(tx.aptName, tx);
    }
  }
  const salesCases = Array.from(deduped.values())
    .sort((a, b) => b.dealYear - a.dealYear || b.dealMonth - a.dealMonth)
    .slice(0, 8)
    .map((tx) => {
      const areaPyeong = tx.area / 3.3058;
      const priceManwon = Math.round(tx.dealAmount / 10000);
      return {
        complexName: tx.aptName,
        address: `${tx.dong} ${address.split(" ").slice(0, 1).join("")}`.trim(),
        exclusiveArea: tx.area,
        supplyArea: Math.round(tx.area * 1.3 * 100) / 100,
        transactionDate: `${tx.dealYear}-${String(tx.dealMonth).padStart(2, "0")}-${String(tx.dealDay).padStart(2, "0")}`,
        transactionPrice: priceManwon,
        pricePerExclusivePyeong: areaPyeong > 0 ? Math.round(priceManwon / areaPyeong) : 0,
        pricePerSupplyPyeong: areaPyeong > 0 ? Math.round(priceManwon / (areaPyeong * 1.3)) : 0,
        floor: tx.floor,
        buildYear: tx.buildYear,
        distanceKm: 0,
      };
    });

  return {
    location,
    nearbyDevelopment,
    facilityOverview,
    priceReview: {
      regionalTrend,
      salesCases,
      supplyCases,
      premiumAnalysis,
    },
    adequacyOpinion: {
      plannedPrice: [
        {
          type: "대표타입",
          pricePerPyeong: plannedPrice,
          totalPrice: 0,
        },
      ],
      comparison: [
        {
          target: "인근 평균 시세",
          pricePerPyeong: comp.currentAvg,
          gap: comp.gapAmount,
          gapRate: comp.gapRate,
        },
      ],
      conclusion: priceConclusion ||
        (`본건 계획 분양가(${plannedPrice.toLocaleString()}만원/평)는 ` +
        `인근 평균 시세(${comp.currentAvg.toLocaleString()}만원/평) 대비 ` +
        `${comp.gapRate > 0 ? "+" : ""}${comp.gapRate}%로, ` +
        `${comp.assessment} 수준으로 판단됩니다.`),
    },
    locationNarrative,
  };
}

// ─── V. 상환능력 분석 ───

/** 시나리오명을 SCR 시나리오 타입으로 매핑 */
function mapScenarioName(
  name: string,
  saleRate?: number
): "낙관" | "기본" | "보수" | "비관" {
  if (saleRate !== undefined) {
    if (saleRate >= 1.0) return "낙관";
    if (saleRate >= 0.95) return "기본";
    if (saleRate >= 0.9) return "보수";
    return "비관";
  }
  if (name.includes("차주") || name === "차주안") return "기본";
  if (name.includes("낙관")) return "낙관";
  if (name.includes("보수")) return "보수";
  if (name.includes("비관")) return "비관";
  return "보수";
}

export function buildRepaymentAnalysis(
  calcResults: CalcResults,
  parsedDocs: ParsedDocument[],
  incomeNarrative?: string,
  cashflowNarrative?: string,
  scenarioNarrative?: string,
  overallConclusion?: string
): ScrRepaymentAnalysis {
  const { businessIncome, monthlyCashflow, scenarios, sensitivity, bep, dscr } =
    calcResults;

  const scrBusinessIncome: ScrBusinessIncome = {
    revenue: {
      apartment: businessIncome.breakdown.find(
        (b) => b.item === "아파트 분양수입"
      )?.amount || 0,
      officetel: businessIncome.breakdown.find(
        (b) => b.item === "오피스텔 분양수입"
      )?.amount || 0,
      balconyExpansion: businessIncome.breakdown.find(
        (b) => b.item === "발코니확장비"
      )?.amount || 0,
      commercial: businessIncome.breakdown.find(
        (b) => b.item === "상가 분양수입"
      )?.amount || 0,
      interimInterest: businessIncome.breakdown.find(
        (b) => b.item === "중도금이자후불"
      )?.amount || 0,
      vat: businessIncome.breakdown.find(
        (b) => b.item === "VAT"
      )?.amount || 0,
      total: businessIncome.totalRevenue,
    },
    cost: {
      land: businessIncome.breakdown.find(
        (b) => b.item === "토지비"
      )?.amount || 0,
      directConstruction: businessIncome.breakdown.find(
        (b) => b.item === "직접공사비"
      )?.amount || 0,
      indirectConstruction: businessIncome.breakdown.find(
        (b) => b.item === "간접공사비"
      )?.amount || 0,
      salesExpense: businessIncome.breakdown.find(
        (b) => b.item === "판매비"
      )?.amount || 0,
      generalAdmin: businessIncome.breakdown.find(
        (b) => b.item === "일반부대비용"
      )?.amount || 0,
      tax: businessIncome.breakdown.find(
        (b) => b.item === "제세공과금"
      )?.amount || 0,
      pfFee: businessIncome.breakdown.find(
        (b) => b.item === "PF 수수료"
      )?.amount || 0,
      pfInterest: businessIncome.breakdown.find(
        (b) => b.item === "PF 이자"
      )?.amount || 0,
      interimInterest: businessIncome.breakdown.find(
        (b) => b.item === "중도금대출이자"
      )?.amount || 0,
      total: businessIncome.totalCost,
    },
    profitBeforeTax: businessIncome.profitBeforeTax,
    profitRate: businessIncome.profitRate,
  };

  const toScrMonthly = (
    rows: CalcResults["monthlyCashflow"]["rows"]
  ): ScrMonthlyRow[] =>
    rows.map((r) => ({
      yearMonth: r.period,
      values: {
        수입합계: r.revenueTotal,
        지출합계: r.costTotal,
        사업수지: r.operatingCashflow,
        자금조달: r.fundingTotal,
        자금상환: r.repaymentTotal,
        현금증감: r.cashChange,
        현금잔액: r.cashBalance,
      },
    }));

  const scenarioAnalysis: ScrScenarioAnalysis = {
    conditions: scenarios.projections.slice(1).map((p) => {
      const baseRev = scenarios.projections[0]?.totalRevenue || 1;
      const rate = p.totalRevenue / baseRev;
      return {
        scenario: mapScenarioName(p.name, rate),
        saleRate: Math.round(rate * 100),
        description: `${p.name}: 분양률 변동 시나리오`,
      };
    }),
    projections: scenarios.projections.map((p) => ({
      scenario: mapScenarioName(p.name, p.totalRevenue / (businessIncome.totalRevenue || 1)),
      totalRevenue: p.totalRevenue,
      totalCost: p.totalCost,
      profitBeforeTax: p.profitBeforeTax,
      profitRate: p.profitRate,
      repaymentPossible: p.profitBeforeTax >= 0,
    })),
    sensitivity: sensitivity.scenarios.map((s) => ({
      variable: "분양률",
      changePercent: s.maturitySaleRate - 100,
      profitImpact: s.profitBeforeTax,
      profitRateImpact: s.profitRate,
    })),
  };

  const bepAnalysis: ScrBepAnalysis = {
    pfRepaymentBep: [
      {
        type: "전시설 동일",
        bepSaleRate: bep.bep1.pfExitBep,
        bepUnits: 0,
      },
      {
        type: "오피스텔/상가 50%",
        bepSaleRate: bep.bep2.pfExitBep,
        bepUnits: 0,
      },
      {
        type: "오피스텔/상가 0%",
        bepSaleRate: bep.bep3.pfExitBep,
        bepUnits: 0,
      },
    ],
    totalCostBep: [
      {
        type: "전시설 동일",
        bepSaleRate: bep.bep1.businessBep,
        bepUnits: 0,
      },
      {
        type: "오피스텔/상가 50%",
        bepSaleRate: bep.bep2.businessBep,
        bepUnits: 0,
      },
      {
        type: "오피스텔/상가 0%",
        bepSaleRate: bep.bep3.businessBep,
        bepUnits: 0,
      },
    ],
    scenarioBep: [
      {
        scenario: "전시설 동일",
        bepSaleRate: bep.bep1.businessBep,
        margin: 100 - bep.bep1.businessBep,
      },
      {
        scenario: "오피스텔/상가 50%",
        bepSaleRate: bep.bep2.businessBep,
        margin: 100 - bep.bep2.businessBep,
      },
      {
        scenario: "오피스텔/상가 0%",
        bepSaleRate: bep.bep3.businessBep,
        margin: 100 - bep.bep3.businessBep,
      },
    ],
  };

  // ── 기간별 분양률 ──
  const periodSaleRateRaw = localGetClaimJson<
    { period: string; shortTermRate: number; cumulativeRate: number }[]
  >(parsedDocs, "period_sale_rate");

  const periodSaleRate: ScrPeriodSaleRateRow[] = periodSaleRateRaw?.length
    ? periodSaleRateRaw.map((r) => ({
        period: r.period,
        shortTermRate: r.shortTermRate,
        cumulativeRate: r.cumulativeRate,
      }))
    : [
        { period: "착공~6개월", shortTermRate: 15, cumulativeRate: 15 },
        { period: "6~12개월", shortTermRate: 25, cumulativeRate: 40 },
        { period: "12~24개월", shortTermRate: 35, cumulativeRate: 75 },
        { period: "24개월~준공", shortTermRate: 25, cumulativeRate: 100 },
      ];

  // ── 자금조달 규모 ──
  const pfTotal = localGetClaimValue(parsedDocs, "pf_total");
  const equityAmount = localGetClaimValue(parsedDocs, "equity_amount");
  const existingPf = localGetClaimValue(parsedDocs, "existing_pf_amount");
  const newPf = localGetClaimValue(parsedDocs, "new_pf_amount");
  const fundingTotal = pfTotal + equityAmount;

  const fundingScale: ScrFundingScaleRow[] = [];
  if (existingPf > 0) {
    fundingScale.push({
      source: "기존 PF 대출",
      amount: existingPf,
      ratio: fundingTotal > 0 ? Math.round((existingPf / fundingTotal) * 1000) / 10 : 0,
    });
  }
  if (newPf > 0) {
    fundingScale.push({
      source: "신규 PF 대출",
      amount: newPf,
      ratio: fundingTotal > 0 ? Math.round((newPf / fundingTotal) * 1000) / 10 : 0,
    });
  }
  if (existingPf === 0 && newPf === 0 && pfTotal > 0) {
    fundingScale.push({
      source: "PF 대출 합계",
      amount: pfTotal,
      ratio: fundingTotal > 0 ? Math.round((pfTotal / fundingTotal) * 1000) / 10 : 0,
    });
  }
  if (equityAmount > 0) {
    fundingScale.push({
      source: "자기자본",
      amount: equityAmount,
      ratio: fundingTotal > 0 ? Math.round((equityAmount / fundingTotal) * 1000) / 10 : 0,
    });
  }
  // 폴백: 아무 값도 없으면 cashflow summary에서 추출
  if (fundingScale.length === 0 && monthlyCashflow.summary.totalFunding > 0) {
    fundingScale.push({
      source: "자금조달 합계",
      amount: monthlyCashflow.summary.totalFunding,
      ratio: 100,
    });
  }

  // ── 전제사항 (DSCR 포함) ──
  const dscrText = dscr
    ? ` DSCR은 ${dscr.cumulativeDscr.toFixed(2)}배로 산출되었으며, ` +
      `${dscr.cumulativeDscr >= 1.2 ? "안정적" : dscr.cumulativeDscr >= 1.0 ? "적정" : "취약"}한 수준입니다.`
    : "";

  return {
    assumptions:
      "본 분석은 차주가 제출한 사업계획서상의 수치를 기준으로 하며, " +
      "분양률 100% 기준 사업수지를 차주안으로 설정하였습니다." +
      dscrText,
    periodSaleRate,
    businessIncome: scrBusinessIncome,
    cashFlowSummary: [
      {
        item: "분양수입 합계",
        amount: monthlyCashflow.summary.totalRevenue,
      },
      {
        item: "사업비 합계",
        amount: monthlyCashflow.summary.totalCost,
      },
      {
        item: "자금조달 합계",
        amount: monthlyCashflow.summary.totalFunding,
      },
      {
        item: "자금상환 합계",
        amount: monthlyCashflow.summary.totalRepayment,
      },
      {
        item: "최종 현금잔액",
        amount: monthlyCashflow.summary.finalCashBalance,
      },
    ],
    fundingScale,
    monthlyCashFlow: {
      part1: toScrMonthly(monthlyCashflow.part1),
      part2: toScrMonthly(monthlyCashflow.part2),
      part3: toScrMonthly(monthlyCashflow.part3),
    },
    scenario: scenarioAnalysis,
    bep: bepAnalysis,
    incomeNarrative,
    cashflowNarrative,
    scenarioNarrative,
    overallConclusion,
  };
}

// ─── 부록 ───

export function buildAppendices(
  apiData: ExternalApiData,
  district: string = ""
): ScrAppendices {
  const { staticMarket } = apiData;

  // 폴백: 금리 추이
  const interestRates = generateFallbackInterestRate().trends;
  // 폴백: 가격지수
  const priceFb = generateFallbackPriceIndex(district);
  const priceIndices = apiData.salePriceIndex?.indices || priceFb.indices;
  const rentIndices = apiData.rentPriceIndex?.indices || priceFb.rentIndices;

  return {
    policyHistory: staticMarket.recentPolicies.map((p) => ({
      date: p.date,
      policy: p.title,
      detail: p.description,
    })),
    loanRegulations: [
      ...staticMarket.loanRegulations.ltv.map((r) => ({
        category: r.category,
        condition: r.condition,
        ltv: r.ratio,
        dti: 0,
        note: r.area,
      })),
      ...staticMarket.loanRegulations.dti.map((r) => ({
        category: r.category,
        condition: r.condition,
        ltv: 0,
        dti: r.ratio,
        note: r.area,
      })),
    ],
    regulatedAreas: staticMarket.regulationStatus.regulations.map((r) => ({
      areaType: r.type,
      regions: [r.region],
      designationDate: r.designatedDate,
    })),
    hugAreas: staticMarket.hugStatus.area
      ? [
          {
            region: staticMarket.hugStatus.area.region,
            guaranteeType: "고분양가 관리",
            condition: `기준 분양가 ${staticMarket.hugStatus.area.priceThreshold}만원/3.3㎡`,
          },
        ]
      : [],
    nearbyDevelopmentDetail: [],
    interestRateTrend: interestRates,
    priceIndexTrend: priceIndices.map((idx) => ({
      yearMonth: idx.yearMonth,
      apartmentIndex: idx.index,
      jeonseIndex:
        rentIndices.find((ri) => ri.yearMonth === idx.yearMonth)?.index || 0,
    })),
  };
}
