/**
 * SCR 보고서 64개 표 HTML 렌더링 모듈
 *
 * 모든 함수는 순수 HTML 문자열을 반환합니다 (서버사이드 호출 가능).
 * Recharts / React 미사용.
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
  ScrSalesCase,
  ScrSupplyCase,
  ScrPremiumRow,
  ScrSupplyItem,
  ScrUnsoldComplex,
  YearlyRow,
} from "./scr-types";

// ─── 유틸 ───

/** 천단위 콤마 포맷 */
function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return v.toLocaleString("ko-KR");
}

/** 퍼센트 포맷 */
function pct(v: number | null | undefined, d = 1): string {
  if (v === null || v === undefined) return "-";
  return `${v.toFixed(d)}%`;
}

/** 빈 셀 */
function safe(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

/** 표 캡션 + 래퍼 시작 */
function tableOpen(no: number, title: string): string {
  return `<div class="scr-table-wrap avoid-break">
<p class="scr-table-caption">표${no}: ${title}</p>
<table class="scr-table">`;
}

/** 표 래퍼 닫기 */
function tableClose(): string {
  return `</table></div>`;
}

/** thead 한 줄 */
function thead(headers: string[]): string {
  return `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
}

/** tbody 시작/끝 */
function tbodyOpen(): string { return "<tbody>"; }
function tbodyClose(): string { return "</tbody>"; }

/** 일반 행 */
function tr(cells: { v: string; cls?: string }[]): string {
  return `<tr>${cells.map((c) => `<td${c.cls ? ` class="${c.cls}"` : ""}>${c.v}</td>`).join("")}</tr>`;
}

/** 키-값 2열 행 (사업개요 등) */
function kvRow(label: string, value: string): string {
  return `<tr><td class="label">${label}</td><td class="num">${value}</td></tr>`;
}

// ─── 표별 렌더링 함수 ───

/** 표1: 사업개요 */
function t1(d: ScrReportData): string {
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
function t2(d: ScrReportData): string {
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
function t3(d: ScrReportData): string {
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
function t4(d: ScrReportData): string {
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
function t5(d: ScrReportData): string {
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
function t6(d: ScrReportData): string {
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
function t7(d: ScrReportData): string {
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

/** 표8: 회사개요 */
function t8(d: ScrReportData): string {
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
function t9(d: ScrReportData): string {
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
function t10(d: ScrReportData): string {
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
function t11(d: ScrReportData): string {
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
function t12(d: ScrReportData): string {
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
function t13(d: ScrReportData): string {
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
function t14(d: ScrReportData): string {
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
function t15(d: ScrReportData): string {
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
function t16(d: ScrReportData): string {
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

/** 표17: 인구수·세대수 */
function t17(d: ScrReportData): string {
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
function t18(d: ScrReportData): string {
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
function t19(d: ScrReportData): string {
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
function t20(d: ScrReportData): string {
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
function t21(d: ScrReportData): string {
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
function t22(d: ScrReportData): string {
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
function t23(d: ScrReportData): string {
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
function t24(d: ScrReportData): string {
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
function t25(d: ScrReportData): string {
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
function t26(d: ScrReportData): string {
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
function t27(d: ScrReportData): string {
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
function t28(d: ScrReportData): string {
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
function t29(d: ScrReportData): string {
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

/** 표30: 입지여건 */
function t30(d: ScrReportData): string {
  const loc = d.priceAdequacy.location;
  let body = "";
  // 교통
  body += `<tr><td class="label" rowspan="${loc.transportation.length || 1}">교통</td>`;
  if (loc.transportation.length) {
    body += `<td>${loc.transportation[0].item}</td><td>${loc.transportation[0].distance}</td><td>${safe(loc.transportation[0].note)}</td></tr>`;
    loc.transportation.slice(1).forEach((t) => {
      body += `<tr><td>${t.item}</td><td>${t.distance}</td><td>${safe(t.note)}</td></tr>`;
    });
  } else {
    body += `<td class="empty" colspan="3">-</td></tr>`;
  }
  // 생활인프라
  body += `<tr><td class="label" rowspan="${loc.livingInfra.length || 1}">생활인프라</td>`;
  if (loc.livingInfra.length) {
    body += `<td>${loc.livingInfra[0].item}</td><td>${loc.livingInfra[0].distance}</td><td>${safe(loc.livingInfra[0].note)}</td></tr>`;
    loc.livingInfra.slice(1).forEach((t) => {
      body += `<tr><td>${t.item}</td><td>${t.distance}</td><td>${safe(t.note)}</td></tr>`;
    });
  } else {
    body += `<td class="empty" colspan="3">-</td></tr>`;
  }
  // 교육
  body += `<tr><td class="label" rowspan="${loc.education.length || 1}">교육</td>`;
  if (loc.education.length) {
    body += `<td>${loc.education[0].item}</td><td>${loc.education[0].distance}</td><td>${safe(loc.education[0].note)}</td></tr>`;
    loc.education.slice(1).forEach((t) => {
      body += `<tr><td>${t.item}</td><td>${t.distance}</td><td>${safe(t.note)}</td></tr>`;
    });
  } else {
    body += `<td class="empty" colspan="3">-</td></tr>`;
  }

  return tableOpen(30, "입지여건 분석") +
    thead(["구분", "항목", "거리/시간", "비고"]) + tbodyOpen() + body + tbodyClose() + tableClose();
}

/** 표31: 인근 개발계획 */
function t31(d: ScrReportData): string {
  const rows = d.priceAdequacy.nearbyDevelopment;
  return tableOpen(31, "인근 개발계획") +
    thead(["사업명", "내용", "완공예정", "영향", "비고"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.planName }, { v: r.description },
      { v: safe(r.expectedCompletion) }, { v: r.impact }, { v: safe(r.note) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표32: 지역 시세·분양가 추이 7년 */
function t32(d: ScrReportData): string {
  const rows = d.priceAdequacy.priceReview.regionalTrend;
  return tableOpen(32, "지역 평균 시세 및 분양가 추이") +
    thead(["연도", "평균시세(만원/평)", "평균분양가(만원/평)", "프리미엄률(%)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: String(r.year) },
      { v: fmt(r.avgMarketPrice), cls: "num" }, { v: fmt(r.avgSalePrice), cls: "num" },
      { v: pct(r.premiumRate), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표33: 인근 매매사례 (요약) */
function t33(d: ScrReportData): string {
  const rows = d.priceAdequacy.priceReview.salesCases;
  return tableOpen(33, "인근 매매사례") +
    thead(["단지명", "전용(㎡)", "거래일", "거래가(만원)", "전용 평당가", "층", "건축연도"]) + tbodyOpen() +
    rows.map((r: ScrSalesCase) => tr([
      { v: r.complexName }, { v: fmt(r.exclusiveArea), cls: "num" },
      { v: safe(r.transactionDate) }, { v: fmt(r.transactionPrice), cls: "num" },
      { v: fmt(r.pricePerExclusivePyeong), cls: "num" }, { v: String(r.floor), cls: "num" },
      { v: String(r.buildYear) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표34: 인근 매매사례 (상세) */
function t34(d: ScrReportData): string {
  const rows = d.priceAdequacy.priceReview.salesCases;
  return tableOpen(34, "인근 매매사례 상세") +
    thead(["단지명", "주소", "전용(㎡)", "공급(㎡)", "공급 평당가", "거리(km)", "비고"]) + tbodyOpen() +
    rows.map((r: ScrSalesCase) => tr([
      { v: r.complexName }, { v: r.address },
      { v: fmt(r.exclusiveArea), cls: "num" }, { v: fmt(r.supplyArea), cls: "num" },
      { v: fmt(r.pricePerSupplyPyeong), cls: "num" }, { v: r.distanceKm.toFixed(1), cls: "num" },
      { v: safe(r.note) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표35: 인근 분양사례 */
function t35(d: ScrReportData): string {
  const rows = d.priceAdequacy.priceReview.supplyCases;
  return tableOpen(35, "인근 분양사례") +
    thead(["단지명", "시행사", "시공사", "세대수", "전용(㎡)", "분양가(만원/평)", "분양률(%)"]) + tbodyOpen() +
    rows.map((r: ScrSupplyCase) => tr([
      { v: r.complexName }, { v: r.developer }, { v: r.constructor },
      { v: fmt(r.totalUnits), cls: "num" }, { v: fmt(r.exclusiveArea), cls: "num" },
      { v: fmt(r.salePricePerPyeong), cls: "num" }, { v: r.saleRate != null ? pct(r.saleRate) : "-", cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표36: 인근 분양사례 상세 */
function t36(d: ScrReportData): string {
  const rows = d.priceAdequacy.priceReview.supplyCases;
  return tableOpen(36, "인근 분양사례 상세") +
    thead(["단지명", "주소", "공급(㎡)", "분양일", "현시세(만원/평)", "프리미엄(%)", "비고"]) + tbodyOpen() +
    rows.map((r: ScrSupplyCase) => tr([
      { v: r.complexName }, { v: r.address },
      { v: fmt(r.supplyArea), cls: "num" }, { v: safe(r.saleDate) },
      { v: r.currentMarketPrice ? fmt(r.currentMarketPrice) : "-", cls: "num" },
      { v: r.premiumRate != null ? pct(r.premiumRate) : "-", cls: "pct" },
      { v: safe(r.note) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표37: 분양사례 프리미엄 */
function t37(d: ScrReportData): string {
  const rows = d.priceAdequacy.priceReview.premiumAnalysis;
  return tableOpen(37, "분양사례 프리미엄 분석") +
    thead(["단지명", "분양가(만원/평)", "현시세(만원/평)", "프리미엄(만원/평)", "프리미엄률(%)"]) + tbodyOpen() +
    rows.map((r: ScrPremiumRow) => tr([
      { v: r.complexName },
      { v: fmt(r.salePricePerPyeong), cls: "num" }, { v: fmt(r.currentPricePerPyeong), cls: "num" },
      { v: fmt(r.premiumAmount), cls: "num" }, { v: pct(r.premiumRate), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표38: 본건 계획 분양가 */
function t38(d: ScrReportData): string {
  const rows = d.priceAdequacy.adequacyOpinion.plannedPrice;
  return tableOpen(38, "본건 계획 분양가") +
    thead(["타입", "평당가(만원/평)", "총 분양가(만원)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.type },
      { v: fmt(r.pricePerPyeong), cls: "num" }, { v: fmt(r.totalPrice), cls: "num" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표39: 비교대상 평당가격 */
function t39(d: ScrReportData): string {
  const rows = d.priceAdequacy.adequacyOpinion.comparison;
  return tableOpen(39, "주요 비교대상 평당가격") +
    thead(["비교대상", "평당가(만원/평)", "본건대비 차이(만원)", "차이율(%)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.target },
      { v: fmt(r.pricePerPyeong), cls: "num" }, { v: fmt(r.gap), cls: "num" },
      { v: pct(r.gapRate), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표40: 기간별 분양률 */
function t40(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.periodSaleRate;
  return tableOpen(40, "기간별 분양률") +
    thead(["기간", "단기 분양률(%)", "누적 분양률(%)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.period },
      { v: pct(r.shortTermRate), cls: "pct" }, { v: pct(r.cumulativeRate), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표41: 사업수지 */
function t41(d: ScrReportData): string {
  const bi = d.repaymentAnalysis.businessIncome;
  return tableOpen(41, "사업수지") +
    thead(["구분", "항목", "금액(만원)"]) + tbodyOpen() +
    `<tr><td class="label" rowspan="7">수입</td><td>아파트</td><td class="num">${fmt(bi.revenue.apartment)}</td></tr>` +
    `<tr><td>오피스텔</td><td class="num">${fmt(bi.revenue.officetel)}</td></tr>` +
    `<tr><td>발코니 확장</td><td class="num">${fmt(bi.revenue.balconyExpansion)}</td></tr>` +
    `<tr><td>상가</td><td class="num">${fmt(bi.revenue.commercial)}</td></tr>` +
    `<tr><td>중도금 이자</td><td class="num">${fmt(bi.revenue.interimInterest)}</td></tr>` +
    `<tr><td>부가세</td><td class="num">${fmt(bi.revenue.vat)}</td></tr>` +
    `<tr><td><strong>수입 합계</strong></td><td class="num"><strong>${fmt(bi.revenue.total)}</strong></td></tr>` +
    `<tr><td class="label" rowspan="10">지출</td><td>토지비</td><td class="num">${fmt(bi.cost.land)}</td></tr>` +
    `<tr><td>직접공사비</td><td class="num">${fmt(bi.cost.directConstruction)}</td></tr>` +
    `<tr><td>간접공사비</td><td class="num">${fmt(bi.cost.indirectConstruction)}</td></tr>` +
    `<tr><td>분양경비</td><td class="num">${fmt(bi.cost.salesExpense)}</td></tr>` +
    `<tr><td>일반관리비</td><td class="num">${fmt(bi.cost.generalAdmin)}</td></tr>` +
    `<tr><td>제세공과금</td><td class="num">${fmt(bi.cost.tax)}</td></tr>` +
    `<tr><td>PF 수수료</td><td class="num">${fmt(bi.cost.pfFee)}</td></tr>` +
    `<tr><td>PF 이자</td><td class="num">${fmt(bi.cost.pfInterest)}</td></tr>` +
    `<tr><td>중도금 이자</td><td class="num">${fmt(bi.cost.interimInterest)}</td></tr>` +
    `<tr><td><strong>지출 합계</strong></td><td class="num"><strong>${fmt(bi.cost.total)}</strong></td></tr>` +
    `<tr><td class="label" colspan="2"><strong>세전이익 (수익률 ${pct(bi.profitRate)})</strong></td><td class="num"><strong>${fmt(bi.profitBeforeTax)}</strong></td></tr>` +
    tbodyClose() + tableClose();
}

/** 표42: 자금흐름 요약 */
function t42(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.cashFlowSummary;
  return tableOpen(42, "주요 자금흐름 요약") +
    thead(["항목", "금액(만원)", "비고"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.item },
      { v: fmt(r.amount), cls: "num" }, { v: safe(r.note) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표43: 자금조달 규모 */
function t43(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.fundingScale;
  return tableOpen(43, "자금조달 규모") +
    thead(["조달원", "금액(만원)", "비중(%)", "비고"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.source },
      { v: fmt(r.amount), cls: "num" }, { v: pct(r.ratio), cls: "pct" },
      { v: safe(r.note) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표44~46: 월별 자금수지 (파트 1/2/3) */
function tMonthlyCashFlow(tableNo: number, title: string, rows: { yearMonth: string; values: Record<string, number | null> }[]): string {
  if (rows.length === 0) return tableOpen(tableNo, title) + "<tbody><tr><td class='empty'>데이터 없음</td></tr></tbody>" + tableClose();
  const keys = Object.keys(rows[0].values);
  return tableOpen(tableNo, title) +
    thead(["연월", ...keys]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.yearMonth },
      ...keys.map((k) => ({ v: fmt(r.values[k]), cls: "num" as const })),
    ])).join("") +
    tbodyClose() + tableClose();
}

function t44(d: ScrReportData): string { return tMonthlyCashFlow(44, "월별 자금수지 (1)", d.repaymentAnalysis.monthlyCashFlow.part1); }
function t45(d: ScrReportData): string { return tMonthlyCashFlow(45, "월별 자금수지 (2)", d.repaymentAnalysis.monthlyCashFlow.part2); }
function t46(d: ScrReportData): string { return tMonthlyCashFlow(46, "월별 자금수지 (3)", d.repaymentAnalysis.monthlyCashFlow.part3); }

/** 표47: 시나리오별 분양률 조건 */
function t47(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.scenario.conditions;
  return tableOpen(47, "시나리오별 분양률 조건") +
    thead(["시나리오", "분양률(%)", "설명"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.scenario },
      { v: pct(r.saleRate), cls: "pct" }, { v: r.description },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표48: 시나리오별 사업수지 */
function t48(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.scenario.projections;
  return tableOpen(48, "시나리오별 사업수지") +
    thead(["시나리오", "총수입(만원)", "총지출(만원)", "세전이익(만원)", "수익률(%)", "상환가능"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.scenario },
      { v: fmt(r.totalRevenue), cls: "num" }, { v: fmt(r.totalCost), cls: "num" },
      { v: fmt(r.profitBeforeTax), cls: "num" }, { v: pct(r.profitRate), cls: "pct" },
      { v: r.repaymentPossible ? "가능" : "불가" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표49: 민감도 분석 */
function t49(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.scenario.sensitivity;
  return tableOpen(49, "민감도 분석") +
    thead(["변수", "변동률(%)", "이익변동(만원)", "이익률 변동(%p)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.variable },
      { v: pct(r.changePercent), cls: "pct" }, { v: fmt(r.profitImpact), cls: "num" },
      { v: pct(r.profitRateImpact), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표50: PF 원리금 BEP */
function t50(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.bep.pfRepaymentBep;
  return tableOpen(50, "PF 원리금 상환 BEP") +
    thead(["타입", "BEP 분양률(%)", "BEP 세대수"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.type },
      { v: pct(r.bepSaleRate), cls: "pct" }, { v: fmt(r.bepUnits), cls: "num" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표51: 사업비 전체 BEP */
function t51(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.bep.totalCostBep;
  return tableOpen(51, "사업비 전체 BEP") +
    thead(["타입", "BEP 분양률(%)", "BEP 세대수"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.type },
      { v: pct(r.bepSaleRate), cls: "pct" }, { v: fmt(r.bepUnits), cls: "num" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표52: 시나리오별 BEP 요약 */
function t52(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.bep.scenarioBep;
  return tableOpen(52, "시나리오별 BEP 요약") +
    thead(["시나리오", "BEP 분양률(%)", "여유율(%p)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.scenario },
      { v: pct(r.bepSaleRate), cls: "pct" }, { v: pct(r.margin), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표53~54: 정책 히스토리 */
function t53(d: ScrReportData): string {
  const rows = d.appendices.policyHistory;
  const half = Math.ceil(rows.length / 2);
  const first = rows.slice(0, half);
  return tableOpen(53, "부동산 정책 히스토리 (1)") +
    thead(["일자", "정책", "내용"]) + tbodyOpen() +
    first.map((r) => tr([{ v: safe(r.date) }, { v: r.policy }, { v: r.detail }])).join("") +
    tbodyClose() + tableClose();
}

function t54(d: ScrReportData): string {
  const rows = d.appendices.policyHistory;
  const half = Math.ceil(rows.length / 2);
  const second = rows.slice(half);
  return tableOpen(54, "부동산 정책 히스토리 (2)") +
    thead(["일자", "정책", "내용"]) + tbodyOpen() +
    second.map((r) => tr([{ v: safe(r.date) }, { v: r.policy }, { v: r.detail }])).join("") +
    tbodyClose() + tableClose();
}

/** 표55: 대출 규제 */
function t55(d: ScrReportData): string {
  const rows = d.appendices.loanRegulations;
  return tableOpen(55, "대출 규제 현황") +
    thead(["구분", "조건", "LTV(%)", "DTI(%)", "비고"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.category }, { v: r.condition },
      { v: pct(r.ltv), cls: "pct" }, { v: pct(r.dti), cls: "pct" },
      { v: safe(r.note) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표56~58: 규제지역 */
function t56(d: ScrReportData): string {
  const rows = d.appendices.regulatedAreas;
  const items = rows.filter((_, i) => i < Math.ceil(rows.length / 3));
  return tableOpen(56, "규제지역 (1)") +
    thead(["유형", "지역", "지정일"]) + tbodyOpen() +
    items.map((r) => tr([{ v: r.areaType }, { v: r.regions.join(", ") }, { v: safe(r.designationDate) }])).join("") +
    tbodyClose() + tableClose();
}

function t57(d: ScrReportData): string {
  const rows = d.appendices.regulatedAreas;
  const third = Math.ceil(rows.length / 3);
  const items = rows.slice(third, third * 2);
  return tableOpen(57, "규제지역 (2)") +
    thead(["유형", "지역", "지정일"]) + tbodyOpen() +
    items.map((r) => tr([{ v: r.areaType }, { v: r.regions.join(", ") }, { v: safe(r.designationDate) }])).join("") +
    tbodyClose() + tableClose();
}

function t58(d: ScrReportData): string {
  const rows = d.appendices.regulatedAreas;
  const third = Math.ceil(rows.length / 3);
  const items = rows.slice(third * 2);
  return tableOpen(58, "규제지역 (3)") +
    thead(["유형", "지역", "지정일"]) + tbodyOpen() +
    items.map((r) => tr([{ v: r.areaType }, { v: r.regions.join(", ") }, { v: safe(r.designationDate) }])).join("") +
    tbodyClose() + tableClose();
}

/** 표59: HUG 보증 지역 */
function t59(d: ScrReportData): string {
  const rows = d.appendices.hugAreas;
  return tableOpen(59, "HUG 보증 지역") +
    thead(["지역", "보증유형", "조건"]) + tbodyOpen() +
    rows.map((r) => tr([{ v: r.region }, { v: r.guaranteeType }, { v: safe(r.condition) }])).join("") +
    tbodyClose() + tableClose();
}

/** 표60~64: 인근 개발 상세 (5분할) */
function tNearbyDev(tableNo: number, d: ScrReportData): string {
  const all = d.appendices.nearbyDevelopmentDetail;
  const size = Math.ceil(all.length / 5);
  const idx = tableNo - 60;
  const rows = all.slice(idx * size, (idx + 1) * size);
  return tableOpen(tableNo, `인근 개발 상세 (${idx + 1})`) +
    thead(["사업명", "내용", "면적(㎡)", "예산(만원)", "기간", "상태"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.planName }, { v: r.description },
      { v: r.area ? fmt(r.area) : "-", cls: "num" }, { v: r.budget ? fmt(r.budget) : "-", cls: "num" },
      { v: safe(r.period) }, { v: r.status },
    ])).join("") +
    tbodyClose() + tableClose();
}

function t60(d: ScrReportData): string { return tNearbyDev(60, d); }
function t61(d: ScrReportData): string { return tNearbyDev(61, d); }
function t62(d: ScrReportData): string { return tNearbyDev(62, d); }
function t63(d: ScrReportData): string { return tNearbyDev(63, d); }
function t64(d: ScrReportData): string { return tNearbyDev(64, d); }

// ─── 표 렌더링 맵 ───

type TableFn = (d: ScrReportData) => string;

const TABLE_MAP: Record<number, TableFn> = {
  1: t1, 2: t2, 3: t3, 4: t4, 5: t5, 6: t6, 7: t7,
  8: t8, 9: t9, 10: t10, 11: t11, 12: t12, 13: t13, 14: t14, 15: t15, 16: t16,
  17: t17, 18: t18, 19: t19, 20: t20, 21: t21, 22: t22, 23: t23, 24: t24,
  25: t25, 26: t26, 27: t27, 28: t28, 29: t29,
  30: t30, 31: t31, 32: t32, 33: t33, 34: t34, 35: t35, 36: t36, 37: t37, 38: t38, 39: t39,
  40: t40, 41: t41, 42: t42, 43: t43, 44: t44, 45: t45, 46: t46,
  47: t47, 48: t48, 49: t49, 50: t50, 51: t51, 52: t52,
  53: t53, 54: t54, 55: t55, 56: t56, 57: t57, 58: t58, 59: t59,
  60: t60, 61: t61, 62: t62, 63: t63, 64: t64,
};

/** 장별 표 번호 범위 */
const CHAPTER_RANGES: Record<1 | 2 | 3 | 4 | 5 | "appendix", [number, number]> = {
  1: [1, 7],
  2: [8, 16],
  3: [17, 29],
  4: [30, 39],
  5: [40, 52],
  appendix: [53, 64],
};

// ─── 공개 API ───

/** 단일 표 렌더링 */
export function renderTable(tableNumber: number, data: ScrReportData): string {
  const fn = TABLE_MAP[tableNumber];
  if (!fn) return `<!-- 표${tableNumber}: 미정의 -->`;
  return fn(data);
}

/** 장별 전체 표 렌더링 */
export function renderAllTables(chapter: 1 | 2 | 3 | 4 | 5 | "appendix", data: ScrReportData): string {
  const [start, end] = CHAPTER_RANGES[chapter];
  const parts: string[] = [];
  for (let i = start; i <= end; i++) {
    parts.push(renderTable(i, data));
  }
  return parts.join("\n");
}
