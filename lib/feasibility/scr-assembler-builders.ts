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
  MonthlyRow as ScrMonthlyRow,
} from "./scr-types";
import type { ExternalApiData, CalcResults } from "./scr-assembler";
import type { SupplyCaseEntry } from "./static-data";
import { getNearbySupplyCases } from "./static-data";
import type { PriceForecastResult } from "./calc";

// ─── II. 시행사 분석 ───

export function buildDeveloperAnalysis(
  apiData: ExternalApiData
): ScrDeveloperAnalysis {
  const corp = apiData.corpInfo;
  const fin = apiData.financials;

  return {
    companyOverview: {
      companyName: corp?.corpName || "미확인",
      ceoName: corp?.ceoName || "",
      establishedDate: corp?.establishDate || "",
      employeeCount: 0,
      mainBusiness: "부동산개발",
      address: "",
      creditRating: undefined,
    },
    shareholders: [],
    ongoingProjects: [],
    orderBacklog: [],
    profitability: (fin?.incomeStatements || []).map((is) => ({
      year: is.year,
      revenue: is.revenue,
      costOfRevenue: is.costOfSales,
      grossProfit: is.grossProfit,
      sgaExpense: 0,
      operatingProfit: is.operatingProfit,
      ebitda: is.ebitda,
      nonOperatingIncome: 0,
      netIncome: is.netIncome,
    })),
    financialStability: {
      balanceSheet: (fin?.balanceSheets || []).map((bs) => ({
        year: bs.year,
        totalAssets: bs.totalAssets,
        totalLiabilities: bs.totalLiabilities,
        totalBorrowings: 0,
        borrowingDependency: 0,
        debtRatio:
          bs.totalAssets > 0
            ? Math.round(
                (bs.totalLiabilities / bs.totalAssets) * 10000
              ) / 100
            : 0,
        equity: bs.totalAssets - bs.totalLiabilities,
      })),
      liquidity: [],
      borrowingDetail: [],
    },
    cashFlow: [],
  };
}

// ─── III. 시장 분석 ───

export function buildMarketAnalysis(
  apiData: ExternalApiData
): ScrMarketAnalysis {
  const { staticMarket } = apiData;
  const loanRegs = staticMarket.loanRegulations;

  const ltvRatio = loanRegs.ltv[0]?.ratio || 70;
  const dtiRatio = loanRegs.dti[0]?.ratio || 60;
  const dsrRatio = loanRegs.dsr[0]?.ratio || 40;

  const popTrends = apiData.populationTrends?.trends || [];
  const moisAge = apiData.moisAge?.ageGroups || [];

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
      supplyRate:
        apiData.housingSupply?.trends.map((t) => ({
          year: t.year,
          supplyRate: t.supplyRate,
          totalHousing: t.totalHousing,
          apartment: 0,
          rowHouse: 0,
          detached: 0,
          other: 0,
        })) || [],
      transactions: [],
      housingDistribution: [],
      buildingAge: [],
      supplyByArea: [],
      upcomingSupply: [],
      plannedSupply: [],
      unsoldTrend: [],
      unsoldComplexes: [],
    },
  };
}

// ─── IV. 분양가 적정성 ───

export function buildPriceAdequacy(
  priceForecast: PriceForecastResult,
  apiData: ExternalApiData,
  plannedPrice: number,
  address: string = ""
): ScrPriceAdequacy {
  const comp = priceForecast.priceComparison;

  return {
    location: {
      transportation: [],
      livingInfra: [],
      education: [],
      summary: "",
    },
    nearbyDevelopment: [],
    facilityOverview: "",
    priceReview: {
      regionalTrend:
        apiData.salePriceIndex?.indices.map((idx) => {
          const year = parseInt(idx.yearMonth.split("-")[0], 10);
          return {
            year,
            avgMarketPrice: idx.index,
            avgSalePrice: plannedPrice,
            premiumRate: 0,
          };
        }) || [],
      salesCases: [],
      supplyCases: getNearbySupplyCases(address, 8).map(
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
      ),
      premiumAnalysis: [],
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
      conclusion: `본건 계획 분양가(${plannedPrice.toLocaleString()}만원/평)는 ` +
        `인근 평균 시세(${comp.currentAvg.toLocaleString()}만원/평) 대비 ` +
        `${comp.gapRate > 0 ? "+" : ""}${comp.gapRate}%로, ` +
        `${comp.assessment} 수준으로 판단됩니다.`,
    },
  };
}

// ─── V. 상환능력 분석 ───

/** 시나리오명을 SCR 시나리오 타입으로 매핑 */
function mapScenarioName(
  name: string,
  saleRate?: number
): "낙관" | "기본" | "보수" | "비관" {
  if (saleRate !== undefined) {
    if (saleRate >= 1.0) return "기본";
    if (saleRate >= 0.95) return "낙관";
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
  calcResults: CalcResults
): ScrRepaymentAnalysis {
  const { businessIncome, monthlyCashflow, scenarios, sensitivity, bep } =
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

  return {
    assumptions:
      "본 분석은 차주가 제출한 사업계획서상의 수치를 기준으로 하며, " +
      "분양률 100% 기준 사업수지를 차주안으로 설정하였습니다.",
    periodSaleRate: [],
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
    fundingScale: [],
    monthlyCashFlow: {
      part1: toScrMonthly(monthlyCashflow.part1),
      part2: toScrMonthly(monthlyCashflow.part2),
      part3: toScrMonthly(monthlyCashflow.part3),
    },
    scenario: scenarioAnalysis,
    bep: bepAnalysis,
  };
}

// ─── 부록 ───

export function buildAppendices(apiData: ExternalApiData): ScrAppendices {
  const { staticMarket } = apiData;

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
    interestRateTrend: [],
    priceIndexTrend:
      apiData.salePriceIndex?.indices.map((idx) => ({
        yearMonth: idx.yearMonth,
        apartmentIndex: idx.index,
        jeonseIndex:
          apiData.rentPriceIndex?.indices.find(
            (ri) => ri.yearMonth === idx.yearMonth
          )?.index || 0,
      })) || [],
  };
}
