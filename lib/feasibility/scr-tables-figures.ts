/**
 * SCR 표 1~29 렌더링 (장 I~III)
 *
 * 사업개요(1-7), 시행사분석(8-16), 시장분석(17-29)
 *
 * @module lib/feasibility/scr-tables-figures
 */

import type {
  ScrReportData,
  ScrSaleTypeRow,
  ScrPaymentScheduleRow,
  ScrScheduleItem,
  ScrLandStatusRow,
  ScrShareholderRow,
  ScrOngoingProjectRow,
  ScrProfitabilityRow,
  ScrCashFlowRow,
  ScrSupplyItem,
  ScrUnsoldComplex,
  YearlyRow,
} from "./scr-types";
import {
  fmt, pct, safe, tableOpen, tableClose, thead,
  tbodyOpen, tbodyClose, tr, kvRow,
} from "./scr-table-utils";

// ─── 장 I: 사업개요 (표1~7) ───

/** 표1: 사업개요 */
export function t1(d: ScrReportData): string {
  const s = d.projectOverview.projectSummary;
  return tableOpen(1, "사업개요") +
    thead(["항목", "내용"]) + tbodyOpen() +
    kvRow("사업명", s.projectName) +
    kvRow("소재지", s.siteAddress) +
    kvRow("지구/구역", s.zoneDistrict) +
    kvRow("시행사", s.developer) +
    kvRow("시공사", s.constructor) +
    kvRow("용도", s.purpose) +
    kvRow("대지면적", `${fmt(s.totalLandArea)} ㎡`) +
    kvRow("연면적", `${fmt(s.totalFloorArea)} ㎡`) +
    kvRow("건폐율", pct(s.buildingCoverageRatio)) +
    kvRow("용적률", pct(s.floorAreaRatio)) +
    kvRow("규모", `지하 ${s.belowFloors}층 ~ 지상 ${s.aboveFloors}층, ${s.buildingCount}개동`) +
    kvRow("총 세대수", `${fmt(s.totalUnits)} 세대`) +
    kvRow("공사기간", `${s.constructionPeriodMonths}개월`) +
    tbodyClose() + tableClose();
}

/** 표2: 사업일정 */
export function t2(d: ScrReportData): string {
  const rows = d.projectOverview.schedule;
  return tableOpen(2, "사업일정") +
    thead(["구분", "계획일", "실제일", "상태"]) + tbodyOpen() +
    rows.map((r: ScrScheduleItem) => tr([
      { v: r.milestone }, { v: safe(r.plannedDate) },
      { v: safe(r.actualDate) }, { v: r.status },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표3: 타입별 분양가 (확장비 미포함) */
export function t3(d: ScrReportData): string {
  const rows = d.projectOverview.salePlan.excludingExpansion;
  return tableOpen(3, "타입별 분양가 (확장비 미포함)") +
    thead(["타입", "세대수", "전용(㎡)", "공급(㎡)", "전용 평당가", "공급 평당가", "세대당 분양가", "소계", "구성비"]) +
    tbodyOpen() +
    rows.map((r: ScrSaleTypeRow) => tr([
      { v: r.type }, { v: fmt(r.units), cls: "num" },
      { v: fmt(r.exclusiveArea), cls: "num" }, { v: fmt(r.supplyArea), cls: "num" },
      { v: fmt(r.pricePerExclusivePyeong), cls: "num" }, { v: fmt(r.pricePerSupplyPyeong), cls: "num" },
      { v: fmt(r.pricePerUnit), cls: "num" }, { v: fmt(r.totalRevenue), cls: "num" },
      { v: pct(r.ratio), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표4: 타입별 분양가 (확장비 포함) */
export function t4(d: ScrReportData): string {
  const rows = d.projectOverview.salePlan.includingExpansion;
  return tableOpen(4, "타입별 분양가 (확장비 포함)") +
    thead(["타입", "세대수", "전용(㎡)", "공급(㎡)", "전용 평당가", "공급 평당가", "세대당 분양가", "소계", "구성비"]) +
    tbodyOpen() +
    rows.map((r: ScrSaleTypeRow) => tr([
      { v: r.type }, { v: fmt(r.units), cls: "num" },
      { v: fmt(r.exclusiveArea), cls: "num" }, { v: fmt(r.supplyArea), cls: "num" },
      { v: fmt(r.pricePerExclusivePyeong), cls: "num" }, { v: fmt(r.pricePerSupplyPyeong), cls: "num" },
      { v: fmt(r.pricePerUnit), cls: "num" }, { v: fmt(r.totalRevenue), cls: "num" },
      { v: pct(r.ratio), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표5: 분양대금 납입일정 */
export function t5(d: ScrReportData): string {
  const rows = d.projectOverview.paymentSchedule;
  return tableOpen(5, "분양대금 납입일정") +
    thead(["구분", "비율", "납입일", "금액(만원)"]) + tbodyOpen() +
    rows.map((r: ScrPaymentScheduleRow) => tr([
      { v: r.stage }, { v: pct(r.percentage), cls: "pct" },
      { v: safe(r.dueDate) }, { v: r.amount ? fmt(r.amount) : "-", cls: "num" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표6: 자금조달 */
export function t6(d: ScrReportData): string {
  const f = d.projectOverview.fundingPlan;
  return tableOpen(6, "자금조달 계획") +
    thead(["항목", "내용"]) + tbodyOpen() +
    kvRow("기존 PF", `${fmt(f.existingPfAmount)} 만원 (${pct(f.pfInterestRateExisting)})`) +
    kvRow("신규 PF", `${fmt(f.newPfAmount)} 만원 (${pct(f.pfInterestRateNew)})`) +
    kvRow("PF 합계", `${fmt(f.pfTotal)} 만원`) +
    kvRow("자기자본", `${fmt(f.equityAmount)} 만원`) +
    kvRow("PF 만기", `${f.pfMaturityMonths}개월`) +
    kvRow("신탁사", f.trustCompany) +
    kvRow("대주단", f.lenders.join(", ")) +
    tbodyClose() + tableClose();
}

/** 표7: 매입토지 현황 */
export function t7(d: ScrReportData): string {
  const rows = d.projectOverview.landStatus;
  return tableOpen(7, "매입토지 현황") +
    thead(["지번", "구분", "면적(㎡)", "평당가(만원)", "합계(만원)", "비고"]) + tbodyOpen() +
    rows.map((r: ScrLandStatusRow) => tr([
      { v: r.parcel }, { v: r.landType },
      { v: fmt(r.area), cls: "num" }, { v: fmt(r.pricePerPyeong), cls: "num" },
      { v: fmt(r.totalPrice), cls: "num" }, { v: safe(r.note) },
    ])).join("") +
    tbodyClose() + tableClose();
}

// ─── 장 II: 시행사분석 (표8~16) ───

/** 표8: 회사개요 */
export function t8(d: ScrReportData): string {
  const c = d.developerAnalysis.companyOverview;
  return tableOpen(8, "시행사 회사개요") +
    thead(["항목", "내용"]) + tbodyOpen() +
    kvRow("회사명", c.companyName) +
    kvRow("대표이사", c.ceoName) +
    kvRow("설립일", c.establishedDate) +
    kvRow("임직원 수", `${fmt(c.employeeCount)}명`) +
    kvRow("주요 사업", c.mainBusiness) +
    kvRow("소재지", c.address) +
    kvRow("신용등급", safe(c.creditRating)) +
    tbodyClose() + tableClose();
}

/** 표9: 주주현황 */
export function t9(d: ScrReportData): string {
  const rows = d.developerAnalysis.shareholders;
  return tableOpen(9, "주주현황") +
    thead(["주주명", "주식수", "지분율(%)", "비고"]) + tbodyOpen() +
    rows.map((r: ScrShareholderRow) => tr([
      { v: r.name }, { v: fmt(r.shareCount), cls: "num" },
      { v: pct(r.shareRatio), cls: "pct" }, { v: safe(r.note) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표10: 진행중 공사현장 */
export function t10(d: ScrReportData): string {
  const rows = d.developerAnalysis.ongoingProjects;
  return tableOpen(10, "진행중 공사현장") +
    thead(["사업명", "소재지", "도급액(만원)", "공정률(%)", "완공예정"]) + tbodyOpen() +
    rows.map((r: ScrOngoingProjectRow) => tr([
      { v: r.projectName }, { v: r.location },
      { v: fmt(r.totalAmount), cls: "num" }, { v: pct(r.progress), cls: "pct" },
      { v: safe(r.expectedCompletion) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표11: 수주잔고 추이 */
export function t11(d: ScrReportData): string {
  const rows = d.developerAnalysis.orderBacklog;
  if (rows.length === 0) return tableOpen(11, "수주잔고 추이") + "<tbody><tr><td class='empty' colspan='2'>데이터 없음</td></tr></tbody>" + tableClose();
  const keys = Object.keys(rows[0].values);
  return tableOpen(11, "수주잔고 추이") +
    thead(["연도", ...keys]) + tbodyOpen() +
    rows.map((r: YearlyRow) => tr([
      { v: String(r.year) },
      ...keys.map((k) => ({ v: fmt(r.values[k]), cls: "num" as const })),
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표12: 수익성 지표 */
export function t12(d: ScrReportData): string {
  const rows = d.developerAnalysis.profitability;
  return tableOpen(12, "수익성 지표 추이") +
    thead(["연도", "매출", "매출원가", "매출총이익", "판관비", "영업이익", "EBITDA", "영업외손익", "당기순이익"]) +
    tbodyOpen() +
    rows.map((r: ScrProfitabilityRow) => tr([
      { v: String(r.year) },
      { v: fmt(r.revenue), cls: "num" }, { v: fmt(r.costOfRevenue), cls: "num" },
      { v: fmt(r.grossProfit), cls: "num" }, { v: fmt(r.sgaExpense), cls: "num" },
      { v: fmt(r.operatingProfit), cls: "num" }, { v: fmt(r.ebitda), cls: "num" },
      { v: fmt(r.nonOperatingIncome), cls: "num" }, { v: fmt(r.netIncome), cls: "num" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표13: 재무안정성 */
export function t13(d: ScrReportData): string {
  const rows = d.developerAnalysis.financialStability.balanceSheet;
  return tableOpen(13, "재무안정성") +
    thead(["연도", "총자산", "총부채", "차입금", "차입금의존도(%)", "부채비율(%)", "자기자본"]) +
    tbodyOpen() +
    rows.map((r) => tr([
      { v: String(r.year) },
      { v: fmt(r.totalAssets), cls: "num" }, { v: fmt(r.totalLiabilities), cls: "num" },
      { v: fmt(r.totalBorrowings), cls: "num" }, { v: pct(r.borrowingDependency), cls: "pct" },
      { v: pct(r.debtRatio), cls: "pct" }, { v: fmt(r.equity), cls: "num" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표14: 유동성 */
export function t14(d: ScrReportData): string {
  const rows = d.developerAnalysis.financialStability.liquidity;
  return tableOpen(14, "유동성 분석") +
    thead(["연도", "유동자산", "유동부채", "유동비율(%)", "당좌비율(%)"]) +
    tbodyOpen() +
    rows.map((r) => tr([
      { v: String(r.year) },
      { v: fmt(r.currentAssets), cls: "num" }, { v: fmt(r.currentLiabilities), cls: "num" },
      { v: pct(r.currentRatio), cls: "pct" }, { v: pct(r.quickRatio), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표15: 차입금 현황 */
export function t15(d: ScrReportData): string {
  const rows = d.developerAnalysis.financialStability.borrowingDetail;
  return tableOpen(15, "차입금 현황") +
    thead(["대주", "유형", "금액(만원)", "금리(%)", "만기일"]) +
    tbodyOpen() +
    rows.map((r) => tr([
      { v: r.lender }, { v: r.type },
      { v: fmt(r.amount), cls: "num" }, { v: pct(r.interestRate), cls: "pct" },
      { v: safe(r.maturityDate) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표16: 현금흐름 */
export function t16(d: ScrReportData): string {
  const rows = d.developerAnalysis.cashFlow;
  return tableOpen(16, "현금흐름 추이") +
    thead(["연도", "영업활동", "투자활동", "재무활동", "현금증감", "기말현금"]) +
    tbodyOpen() +
    rows.map((r: ScrCashFlowRow) => tr([
      { v: String(r.year) },
      { v: fmt(r.operating), cls: "num" }, { v: fmt(r.investing), cls: "num" },
      { v: fmt(r.financing), cls: "num" }, { v: fmt(r.netChange), cls: "num" },
      { v: fmt(r.endingBalance), cls: "num" },
    ])).join("") +
    tbodyClose() + tableClose();
}

// ─── 장 III: 시장분석 (표17~29) ───

/** 표17: 인구수·세대수 */
export function t17(d: ScrReportData): string {
  const rows = d.marketAnalysis.demographics.populationHousehold;
  return tableOpen(17, "인구수·세대수 추이") +
    thead(["연도", "인구수", "세대수", "세대당 인구"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: String(r.year) },
      { v: fmt(r.population), cls: "num" }, { v: fmt(r.households), cls: "num" },
      { v: r.personsPerHousehold.toFixed(2), cls: "num" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표18: 연령대별 인구 */
export function t18(d: ScrReportData): string {
  const rows = d.marketAnalysis.demographics.ageDistribution;
  return tableOpen(18, "연령대별 인구분포") +
    thead(["연령대", "인구수", "구성비(%)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.ageGroup },
      { v: fmt(r.count), cls: "num" }, { v: pct(r.ratio), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표19: 산업별 종사자 */
export function t19(d: ScrReportData): string {
  const rows = d.marketAnalysis.demographics.industryEmployment;
  return tableOpen(19, "산업별 종사자 현황") +
    thead(["산업", "종사자수", "구성비(%)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.industry },
      { v: fmt(r.employeeCount), cls: "num" }, { v: pct(r.ratio), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표20: 주택보급률·주택구성 */
export function t20(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.supplyRate;
  return tableOpen(20, "주택보급률 및 주택구성") +
    thead(["연도", "보급률(%)", "총주택", "아파트", "연립/다세대", "단독", "기타"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: String(r.year) }, { v: pct(r.supplyRate), cls: "pct" },
      { v: fmt(r.totalHousing), cls: "num" }, { v: fmt(r.apartment), cls: "num" },
      { v: fmt(r.rowHouse), cls: "num" }, { v: fmt(r.detached), cls: "num" },
      { v: fmt(r.other), cls: "num" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표21: 주택거래량 */
export function t21(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.transactions;
  return tableOpen(21, "주택거래량 추이") +
    thead(["연월", "거래량", "전년대비(%)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.yearMonth },
      { v: fmt(r.count), cls: "num" }, { v: r.yoyChange != null ? pct(r.yoyChange) : "-", cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표22: 유형별 주택분포 */
export function t22(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.housingDistribution;
  return tableOpen(22, "유형별 주택분포") +
    thead(["유형", "호수", "구성비(%)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.type },
      { v: fmt(r.count), cls: "num" }, { v: pct(r.ratio), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표23: 건축연령별 */
export function t23(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.buildingAge;
  return tableOpen(23, "건축연령별 주택 현황") +
    thead(["연령대", "호수", "구성비(%)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.ageRange },
      { v: fmt(r.count), cls: "num" }, { v: pct(r.ratio), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표24: 면적별 공급 */
export function t24(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.supplyByArea;
  return tableOpen(24, "면적별 주택공급 현황") +
    thead(["면적대", "호수", "구성비(%)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.areaRange },
      { v: fmt(r.count), cls: "num" }, { v: pct(r.ratio), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표25: 입주예정 목록 */
export function t25(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.upcomingSupply;
  return tableOpen(25, "입주예정 단지 목록") +
    thead(["단지명", "소재지", "세대수", "입주예정", "시공사"]) + tbodyOpen() +
    rows.map((r: ScrSupplyItem) => tr([
      { v: r.complexName }, { v: r.location },
      { v: fmt(r.totalUnits), cls: "num" }, { v: safe(r.moveInDate) },
      { v: safe(r.constructor) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표26: 입주예정 단지 상세 */
export function t26(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.upcomingSupply;
  return tableOpen(26, "입주예정 단지 상세") +
    thead(["단지명", "시행사", "세대수", "분양가(만원/평)", "입주일"]) + tbodyOpen() +
    rows.map((r: ScrSupplyItem) => tr([
      { v: r.complexName }, { v: safe(r.developer) },
      { v: fmt(r.totalUnits), cls: "num" }, { v: r.salePrice ? fmt(r.salePrice) : "-", cls: "num" },
      { v: safe(r.moveInDate) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표27: 분양예정 단지 */
export function t27(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.plannedSupply;
  return tableOpen(27, "분양예정 단지") +
    thead(["단지명", "소재지", "세대수", "분양예정", "시공사"]) + tbodyOpen() +
    rows.map((r: ScrSupplyItem) => tr([
      { v: r.complexName }, { v: r.location },
      { v: fmt(r.totalUnits), cls: "num" }, { v: safe(r.moveInDate) },
      { v: safe(r.constructor) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표28: 미분양 추이 */
export function t28(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.unsoldTrend;
  return tableOpen(28, "미분양 추이") +
    thead(["연월", "총 미분양", "준공후 미분양"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.yearMonth },
      { v: fmt(r.totalUnsold), cls: "num" }, { v: fmt(r.afterCompletion), cls: "num" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표29: 미분양 단지 */
export function t29(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.unsoldComplexes;
  return tableOpen(29, "미분양 단지 현황") +
    thead(["단지명", "소재지", "총세대", "미분양", "미분양율(%)", "준공일"]) + tbodyOpen() +
    rows.map((r: ScrUnsoldComplex) => tr([
      { v: r.complexName }, { v: r.location },
      { v: fmt(r.totalUnits), cls: "num" }, { v: fmt(r.unsoldUnits), cls: "num" },
      { v: pct(r.unsoldRatio), cls: "pct" }, { v: safe(r.completionDate) },
    ])).join("") +
    tbodyClose() + tableClose();
}
