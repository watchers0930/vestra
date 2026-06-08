/**
 * SCR 표 30~64 렌더링 (장 IV~V + 부록)
 *
 * 분양가적정성(30-39), 상환분석(40-52), 부록(53-64)
 *
 * @module lib/feasibility/scr-tables-analysis
 */

import type {
  ScrReportData,
  ScrSalesCase,
  ScrSupplyCase,
  ScrPremiumRow,
} from "./scr-types";
import {
  fmt, pct, safe, tableOpen, tableClose, thead,
  tbodyOpen, tbodyClose, tr,
} from "./scr-table-utils";

// ─── 장 IV: 분양가적정성 (표30~39) ───

/** 표30: 입지여건 */
export function t30(d: ScrReportData): string {
  const loc = d.priceAdequacy.location;
  let body = "";
  body += `<tr><td class="label" rowspan="${loc.transportation.length || 1}">교통</td>`;
  if (loc.transportation.length) {
    body += `<td>${loc.transportation[0].item}</td><td>${loc.transportation[0].distance}</td><td>${safe(loc.transportation[0].note)}</td></tr>`;
    loc.transportation.slice(1).forEach((t) => {
      body += `<tr><td>${t.item}</td><td>${t.distance}</td><td>${safe(t.note)}</td></tr>`;
    });
  } else {
    body += `<td class="empty" colspan="3">-</td></tr>`;
  }
  body += `<tr><td class="label" rowspan="${loc.livingInfra.length || 1}">생활인프라</td>`;
  if (loc.livingInfra.length) {
    body += `<td>${loc.livingInfra[0].item}</td><td>${loc.livingInfra[0].distance}</td><td>${safe(loc.livingInfra[0].note)}</td></tr>`;
    loc.livingInfra.slice(1).forEach((t) => {
      body += `<tr><td>${t.item}</td><td>${t.distance}</td><td>${safe(t.note)}</td></tr>`;
    });
  } else {
    body += `<td class="empty" colspan="3">-</td></tr>`;
  }
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
export function t31(d: ScrReportData): string {
  const rows = d.priceAdequacy.nearbyDevelopment;
  return tableOpen(31, "인근 개발계획") +
    thead(["사업명", "내용", "완공예정", "영향", "비고"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.planName }, { v: r.description },
      { v: safe(r.expectedCompletion) }, { v: r.impact }, { v: safe(r.note) },
    ])).join("") +
    tbodyClose() + tableClose();
}

/** 표32: 지역 시세·분양가 추이 */
export function t32(d: ScrReportData): string {
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

/** 표33: 인근 매매사례 */
export function t33(d: ScrReportData): string {
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

/** 표34: 인근 매매사례 상세 */
export function t34(d: ScrReportData): string {
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
export function t35(d: ScrReportData): string {
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
export function t36(d: ScrReportData): string {
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
export function t37(d: ScrReportData): string {
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
export function t38(d: ScrReportData): string {
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
export function t39(d: ScrReportData): string {
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

// ─── 장 V: 상환분석 (표40~52) ───

/** 표40: 기간별 분양률 */
export function t40(d: ScrReportData): string {
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
export function t41(d: ScrReportData): string {
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
export function t42(d: ScrReportData): string {
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
export function t43(d: ScrReportData): string {
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

/** 월별 자금수지 공통 렌더 */
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

export function t44(d: ScrReportData): string { return tMonthlyCashFlow(44, "월별 자금수지 (1)", d.repaymentAnalysis.monthlyCashFlow.part1); }
export function t45(d: ScrReportData): string { return tMonthlyCashFlow(45, "월별 자금수지 (2)", d.repaymentAnalysis.monthlyCashFlow.part2); }
export function t46(d: ScrReportData): string { return tMonthlyCashFlow(46, "월별 자금수지 (3)", d.repaymentAnalysis.monthlyCashFlow.part3); }

/** 표47: 시나리오별 분양률 조건 */
export function t47(d: ScrReportData): string {
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
export function t48(d: ScrReportData): string {
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
export function t49(d: ScrReportData): string {
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
export function t50(d: ScrReportData): string {
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
export function t51(d: ScrReportData): string {
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
export function t52(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.bep.scenarioBep;
  return tableOpen(52, "시나리오별 BEP 요약") +
    thead(["시나리오", "BEP 분양률(%)", "여유율(%p)"]) + tbodyOpen() +
    rows.map((r) => tr([
      { v: r.scenario },
      { v: pct(r.bepSaleRate), cls: "pct" }, { v: pct(r.margin), cls: "pct" },
    ])).join("") +
    tbodyClose() + tableClose();
}

// ─── 부록 (표53~64) ───

export function t53(d: ScrReportData): string {
  const rows = d.appendices.policyHistory;
  const half = Math.ceil(rows.length / 2);
  const first = rows.slice(0, half);
  return tableOpen(53, "부동산 정책 히스토리 (1)") +
    thead(["일자", "정책", "내용"]) + tbodyOpen() +
    first.map((r) => tr([{ v: safe(r.date) }, { v: r.policy }, { v: r.detail }])).join("") +
    tbodyClose() + tableClose();
}

export function t54(d: ScrReportData): string {
  const rows = d.appendices.policyHistory;
  const half = Math.ceil(rows.length / 2);
  const second = rows.slice(half);
  return tableOpen(54, "부동산 정책 히스토리 (2)") +
    thead(["일자", "정책", "내용"]) + tbodyOpen() +
    second.map((r) => tr([{ v: safe(r.date) }, { v: r.policy }, { v: r.detail }])).join("") +
    tbodyClose() + tableClose();
}

export function t55(d: ScrReportData): string {
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

export function t56(d: ScrReportData): string {
  const rows = d.appendices.regulatedAreas;
  const items = rows.filter((_, i) => i < Math.ceil(rows.length / 3));
  return tableOpen(56, "규제지역 (1)") +
    thead(["유형", "지역", "지정일"]) + tbodyOpen() +
    items.map((r) => tr([{ v: r.areaType }, { v: r.regions.join(", ") }, { v: safe(r.designationDate) }])).join("") +
    tbodyClose() + tableClose();
}

export function t57(d: ScrReportData): string {
  const rows = d.appendices.regulatedAreas;
  const third = Math.ceil(rows.length / 3);
  const items = rows.slice(third, third * 2);
  return tableOpen(57, "규제지역 (2)") +
    thead(["유형", "지역", "지정일"]) + tbodyOpen() +
    items.map((r) => tr([{ v: r.areaType }, { v: r.regions.join(", ") }, { v: safe(r.designationDate) }])).join("") +
    tbodyClose() + tableClose();
}

export function t58(d: ScrReportData): string {
  const rows = d.appendices.regulatedAreas;
  const third = Math.ceil(rows.length / 3);
  const items = rows.slice(third * 2);
  return tableOpen(58, "규제지역 (3)") +
    thead(["유형", "지역", "지정일"]) + tbodyOpen() +
    items.map((r) => tr([{ v: r.areaType }, { v: r.regions.join(", ") }, { v: safe(r.designationDate) }])).join("") +
    tbodyClose() + tableClose();
}

export function t59(d: ScrReportData): string {
  const rows = d.appendices.hugAreas;
  return tableOpen(59, "HUG 보증 지역") +
    thead(["지역", "보증유형", "조건"]) + tbodyOpen() +
    rows.map((r) => tr([{ v: r.region }, { v: r.guaranteeType }, { v: safe(r.condition) }])).join("") +
    tbodyClose() + tableClose();
}

/** 인근 개발 상세 공통 렌더 */
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

export function t60(d: ScrReportData): string { return tNearbyDev(60, d); }
export function t61(d: ScrReportData): string { return tNearbyDev(61, d); }
export function t62(d: ScrReportData): string { return tNearbyDev(62, d); }
export function t63(d: ScrReportData): string { return tNearbyDev(63, d); }
export function t64(d: ScrReportData): string { return tNearbyDev(64, d); }
