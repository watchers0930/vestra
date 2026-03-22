/**
 * SCR 보고서 23개 차트 SVG 렌더링 모듈
 *
 * 순수 SVG 문자열 반환 — Recharts / React 미사용, 서버사이드 호출 가능.
 */

import type { ScrReportData } from "./scr-types";

// ─── 상수 ───

const COLORS = {
  primary: "#0071e3",
  secondary: "#34c759",
  tertiary: "#ff9500",
  danger: "#ff3b30",
  muted: "#86868b",
  gridLine: "#e5e5e7",
  text: "#6e6e73",
  darkText: "#1d1d1f",
} as const;

const PALETTE = [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.danger, "#af52de", "#5ac8fa", "#ff2d55", "#a2845e"];

/** 기본 viewBox */
const W = 600;
const H = 300;
const PAD = { top: 30, right: 30, bottom: 50, left: 70 };
const CW = W - PAD.left - PAD.right; // 차트 영역 너비
const CH = H - PAD.top - PAD.bottom; // 차트 영역 높이

// ─── SVG 유틸 ───

function svgOpen(width = W, height = H): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="font-family:'Malgun Gothic','맑은 고딕',sans-serif;">`;
}
function svgClose(): string { return "</svg>"; }

/** 그림 래퍼 */
function figureWrap(chartNo: number, title: string, svg: string): string {
  return `<div class="scr-figure avoid-break">${svg}<p class="scr-figure-caption">그림${chartNo}: ${title}</p></div>`;
}

/** 축 그리드 + 라벨 (Y축) */
function yAxisGrid(minVal: number, maxVal: number, ticks = 5): { lines: string; scale: (v: number) => number; tickValues: number[] } {
  const range = maxVal - minVal || 1;
  const step = niceStep(range, ticks);
  const adjMin = Math.floor(minVal / step) * step;
  const adjMax = Math.ceil(maxVal / step) * step;
  const adjRange = adjMax - adjMin || 1;
  const tickValues: number[] = [];
  let lines = "";
  for (let v = adjMin; v <= adjMax + step * 0.01; v += step) {
    tickValues.push(v);
    const y = PAD.top + CH - ((v - adjMin) / adjRange) * CH;
    lines += `<line x1="${PAD.left}" y1="${y}" x2="${W - PAD.right}" y2="${y}" stroke="${COLORS.gridLine}" stroke-width="0.5"/>`;
    lines += `<text x="${PAD.left - 8}" y="${y + 3}" text-anchor="end" font-size="8" fill="${COLORS.text}">${fmtAxis(v)}</text>`;
  }
  const scale = (v: number) => PAD.top + CH - ((v - adjMin) / adjRange) * CH;
  return { lines, scale, tickValues };
}

/** X축 라벨 */
function xAxisLabels(labels: string[], rotate = false): string {
  const step = Math.max(1, Math.ceil(labels.length / 12));
  return labels.map((l, i) => {
    if (i % step !== 0 && i !== labels.length - 1) return "";
    const x = PAD.left + (i / Math.max(labels.length - 1, 1)) * CW;
    if (rotate) {
      return `<text x="${x}" y="${H - PAD.bottom + 14}" font-size="7.5" fill="${COLORS.text}" text-anchor="end" transform="rotate(-35 ${x} ${H - PAD.bottom + 14})">${l}</text>`;
    }
    return `<text x="${x}" y="${H - PAD.bottom + 16}" text-anchor="middle" font-size="8" fill="${COLORS.text}">${l}</text>`;
  }).join("");
}

/** 범례 */
function legend(items: { label: string; color: string }[], y = 12): string {
  let x = PAD.left;
  return items.map((item) => {
    const g = `<rect x="${x}" y="${y - 6}" width="10" height="10" rx="2" fill="${item.color}"/>` +
      `<text x="${x + 14}" y="${y + 3}" font-size="8" fill="${COLORS.darkText}">${item.label}</text>`;
    x += 14 + item.label.length * 7 + 12;
    return g;
  }).join("");
}

/** 축 숫자 포맷 */
function fmtAxis(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (abs >= 10_000) return `${(v / 10_000).toFixed(0)}만`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}천`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

/** nice tick step */
function niceStep(range: number, ticks: number): number {
  const raw = range / ticks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const residual = raw / magnitude;
  let nice: number;
  if (residual <= 1.5) nice = 1;
  else if (residual <= 3) nice = 2;
  else if (residual <= 7) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

/** 배열 min/max */
function minMax(arr: number[]): [number, number] {
  if (arr.length === 0) return [0, 100];
  return [Math.min(...arr), Math.max(...arr)];
}

// ─── 차트 유형별 생성 ───

/** 라인차트 */
function lineChart(
  labels: string[],
  series: { name: string; values: number[]; color: string }[],
  opts?: { chartNo?: number; title?: string },
): string {
  const allVals = series.flatMap((s) => s.values.filter((v) => v != null));
  const [mn, mx] = minMax(allVals);
  const { lines: grid, scale: yScale } = yAxisGrid(Math.min(mn, 0), mx);

  let paths = "";
  series.forEach((s) => {
    const points = s.values.map((v, i) => {
      const x = PAD.left + (i / Math.max(labels.length - 1, 1)) * CW;
      const y = yScale(v);
      return `${x},${y}`;
    });
    paths += `<polyline fill="none" stroke="${s.color}" stroke-width="2" points="${points.join(" ")}"/>`;
    // 점
    s.values.forEach((v, i) => {
      const x = PAD.left + (i / Math.max(labels.length - 1, 1)) * CW;
      paths += `<circle cx="${x}" cy="${yScale(v)}" r="3" fill="${s.color}"/>`;
    });
  });

  const svg = svgOpen() + grid + paths + xAxisLabels(labels, labels.length > 8) +
    legend(series.map((s) => ({ label: s.name, color: s.color }))) + svgClose();
  return opts?.chartNo ? figureWrap(opts.chartNo, opts.title || "", svg) : svg;
}

/** 바차트 (수직) */
function barChart(
  labels: string[],
  series: { name: string; values: number[]; color: string }[],
  opts?: { chartNo?: number; title?: string; stacked?: boolean },
): string {
  const stacked = opts?.stacked ?? false;
  const groupCount = series.length;
  const n = labels.length;
  const groupWidth = CW / n;
  const barWidth = stacked ? groupWidth * 0.6 : (groupWidth * 0.7) / groupCount;

  let allVals: number[];
  if (stacked) {
    allVals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] || 0), 0));
  } else {
    allVals = series.flatMap((s) => s.values);
  }
  const [, mx] = minMax(allVals);
  const { lines: grid, scale: yScale } = yAxisGrid(0, mx);
  const baseY = yScale(0);

  let bars = "";
  if (stacked) {
    labels.forEach((_, i) => {
      let cumY = baseY;
      series.forEach((s) => {
        const val = s.values[i] || 0;
        const h = baseY - yScale(val);
        const x = PAD.left + i * groupWidth + groupWidth * 0.2;
        cumY -= h;
        bars += `<rect x="${x}" y="${cumY}" width="${barWidth}" height="${h}" fill="${s.color}" rx="1"/>`;
      });
    });
  } else {
    labels.forEach((_, i) => {
      series.forEach((s, si) => {
        const val = s.values[i] || 0;
        const h = baseY - yScale(val);
        const x = PAD.left + i * groupWidth + (groupWidth - barWidth * groupCount) / 2 + si * barWidth;
        bars += `<rect x="${x}" y="${baseY - h}" width="${barWidth}" height="${h}" fill="${s.color}" rx="1"/>`;
      });
    });
  }

  const svg = svgOpen() + grid + bars + xAxisLabels(labels, labels.length > 8) +
    legend(series.map((s) => ({ label: s.name, color: s.color }))) + svgClose();
  return opts?.chartNo ? figureWrap(opts.chartNo, opts.title || "", svg) : svg;
}

/** 영역차트 */
function areaChart(
  labels: string[],
  series: { name: string; values: number[]; color: string }[],
  opts?: { chartNo?: number; title?: string },
): string {
  const allVals = series.flatMap((s) => s.values);
  const [mn, mx] = minMax(allVals);
  const { lines: grid, scale: yScale } = yAxisGrid(Math.min(mn, 0), mx);
  const baseY = yScale(0);

  let areas = "";
  series.forEach((s) => {
    const points = s.values.map((v, i) => {
      const x = PAD.left + (i / Math.max(labels.length - 1, 1)) * CW;
      return `${x},${yScale(v)}`;
    });
    const firstX = PAD.left;
    const lastX = PAD.left + CW;
    areas += `<polygon fill="${s.color}" fill-opacity="0.15" stroke="${s.color}" stroke-width="1.5" points="${firstX},${baseY} ${points.join(" ")} ${lastX},${baseY}"/>`;
  });

  const svg = svgOpen() + grid + areas + xAxisLabels(labels, labels.length > 8) +
    legend(series.map((s) => ({ label: s.name, color: s.color }))) + svgClose();
  return opts?.chartNo ? figureWrap(opts.chartNo, opts.title || "", svg) : svg;
}

/** 파이차트 */
function pieChart(
  slices: { label: string; value: number; color: string }[],
  opts?: { chartNo?: number; title?: string },
): string {
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  const cx = W / 2;
  const cy = H / 2 + 10;
  const r = Math.min(CW, CH) / 2 - 20;
  let startAngle = -Math.PI / 2;
  let paths = "";

  slices.forEach((slice) => {
    const angle = (slice.value / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z" fill="${slice.color}" stroke="#fff" stroke-width="1.5"/>`;
    // 라벨
    const midAngle = startAngle + angle / 2;
    const lx = cx + (r * 0.65) * Math.cos(midAngle);
    const ly = cy + (r * 0.65) * Math.sin(midAngle);
    const pctVal = ((slice.value / total) * 100).toFixed(1);
    if (parseFloat(pctVal) > 3) {
      paths += `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="8" font-weight="600" fill="#fff">${pctVal}%</text>`;
    }
    startAngle = endAngle;
  });

  const svg = svgOpen() + paths +
    legend(slices.map((s) => ({ label: s.label, color: s.color })), H - 10) + svgClose();
  return opts?.chartNo ? figureWrap(opts.chartNo, opts.title || "", svg) : svg;
}

// ─── 23개 차트 ───

/** 그림1: 사업구조도 (관계도) — 간이 다이어그램 */
function c1(d: ScrReportData): string {
  const s = d.projectOverview.structureDiagram;
  const boxes = [
    { label: "수분양자", value: s.buyer, x: 250, y: 30 },
    { label: "시행사", value: s.developer, x: 100, y: 130 },
    { label: "시공사", value: s.constructor, x: 400, y: 130 },
    { label: "신탁사", value: s.trustCompany, x: 250, y: 230 },
  ];
  let svg = svgOpen();
  // 연결선
  svg += `<line x1="250" y1="70" x2="150" y2="120" stroke="${COLORS.muted}" stroke-width="1" stroke-dasharray="4"/>`;
  svg += `<line x1="300" y1="70" x2="450" y2="120" stroke="${COLORS.muted}" stroke-width="1" stroke-dasharray="4"/>`;
  svg += `<line x1="150" y1="170" x2="250" y2="220" stroke="${COLORS.muted}" stroke-width="1" stroke-dasharray="4"/>`;
  svg += `<line x1="450" y1="170" x2="300" y2="220" stroke="${COLORS.muted}" stroke-width="1" stroke-dasharray="4"/>`;
  // 박스
  boxes.forEach((b) => {
    svg += `<rect x="${b.x - 50}" y="${b.y}" width="100" height="40" rx="6" fill="#f5f5f7" stroke="${COLORS.primary}" stroke-width="1.2"/>`;
    svg += `<text x="${b.x}" y="${b.y + 16}" text-anchor="middle" font-size="7.5" fill="${COLORS.text}">${b.label}</text>`;
    svg += `<text x="${b.x}" y="${b.y + 30}" text-anchor="middle" font-size="8.5" font-weight="600" fill="${COLORS.darkText}">${b.value}</text>`;
  });
  // 대주단
  if (s.lenders.length) {
    svg += `<rect x="200" y="130" width="200" height="24" rx="4" fill="#eef5ff" stroke="${COLORS.primary}" stroke-width="0.8"/>`;
    svg += `<text x="300" y="146" text-anchor="middle" font-size="7.5" fill="${COLORS.primary}">대주단: ${s.lenders.slice(0, 3).join(", ")}${s.lenders.length > 3 ? " 외" : ""}</text>`;
  }
  svg += svgClose();
  return figureWrap(1, "사업 구조도", svg);
}

/** 그림2: 시세추이 7년 (라인) */
function c2(d: ScrReportData): string {
  const rows = d.priceAdequacy.priceReview.regionalTrend;
  return lineChart(
    rows.map((r) => String(r.year)),
    [
      { name: "평균시세", values: rows.map((r) => r.avgMarketPrice), color: COLORS.primary },
      { name: "평균분양가", values: rows.map((r) => r.avgSalePrice), color: COLORS.tertiary },
    ],
    { chartNo: 2, title: "지역 시세·분양가 추이" },
  );
}

/** 그림3: 인구추이 (바) */
function c3(d: ScrReportData): string {
  const rows = d.marketAnalysis.demographics.populationHousehold;
  return barChart(
    rows.map((r) => String(r.year)),
    [{ name: "인구수", values: rows.map((r) => r.population), color: COLORS.primary }],
    { chartNo: 3, title: "인구수 추이" },
  );
}

/** 그림4: 세대수 추이 (바) */
function c4(d: ScrReportData): string {
  const rows = d.marketAnalysis.demographics.populationHousehold;
  return barChart(
    rows.map((r) => String(r.year)),
    [{ name: "세대수", values: rows.map((r) => r.households), color: COLORS.secondary }],
    { chartNo: 4, title: "세대수 추이" },
  );
}

/** 그림5: 연령대별 인구 (바) */
function c5(d: ScrReportData): string {
  const rows = d.marketAnalysis.demographics.ageDistribution;
  return barChart(
    rows.map((r) => r.ageGroup),
    [{ name: "인구수", values: rows.map((r) => r.count), color: COLORS.primary }],
    { chartNo: 5, title: "연령대별 인구분포" },
  );
}

/** 그림6: 주택보급률 추이 (라인) */
function c6(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.supplyRate;
  return lineChart(
    rows.map((r) => String(r.year)),
    [{ name: "보급률(%)", values: rows.map((r) => r.supplyRate), color: COLORS.primary }],
    { chartNo: 6, title: "주택보급률 추이" },
  );
}

/** 그림7: 주택유형 구성 (파이) */
function c7(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.housingDistribution;
  return pieChart(
    rows.map((r, i) => ({ label: r.type, value: r.count, color: PALETTE[i % PALETTE.length] })),
    { chartNo: 7, title: "유형별 주택 구성" },
  );
}

/** 그림8: 건축연령 구성 (바) */
function c8(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.buildingAge;
  return barChart(
    rows.map((r) => r.ageRange),
    [{ name: "호수", values: rows.map((r) => r.count), color: COLORS.tertiary }],
    { chartNo: 8, title: "건축연령별 주택 현황" },
  );
}

/** 그림9: 공급량 추이 (바) — 입주예정 단지별 세대수 */
function c9(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.upcomingSupply.slice(0, 10);
  return barChart(
    rows.map((r) => r.complexName.length > 6 ? r.complexName.slice(0, 6) + ".." : r.complexName),
    [{ name: "세대수", values: rows.map((r) => r.totalUnits), color: COLORS.primary }],
    { chartNo: 9, title: "입주예정 공급량" },
  );
}

/** 그림10: 미분양 추이 (영역) */
function c10(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.unsoldTrend;
  return areaChart(
    rows.map((r) => r.yearMonth),
    [
      { name: "총 미분양", values: rows.map((r) => r.totalUnsold), color: COLORS.danger },
      { name: "준공후 미분양", values: rows.map((r) => r.afterCompletion), color: COLORS.tertiary },
    ],
    { chartNo: 10, title: "미분양 추이" },
  );
}

/** 그림11: 주택거래량 추이 (바) */
function c11(d: ScrReportData): string {
  const rows = d.marketAnalysis.housingMarket.transactions.slice(-12);
  return barChart(
    rows.map((r) => r.yearMonth),
    [{ name: "거래량", values: rows.map((r) => r.count), color: COLORS.secondary }],
    { chartNo: 11, title: "주택거래량 추이" },
  );
}

/** 그림12: 프리미엄 비교 (바) */
function c12(d: ScrReportData): string {
  const rows = d.priceAdequacy.priceReview.premiumAnalysis;
  return barChart(
    rows.map((r) => r.complexName.length > 6 ? r.complexName.slice(0, 6) + ".." : r.complexName),
    [
      { name: "분양가", values: rows.map((r) => r.salePricePerPyeong), color: COLORS.primary },
      { name: "현시세", values: rows.map((r) => r.currentPricePerPyeong), color: COLORS.secondary },
    ],
    { chartNo: 12, title: "분양사례 프리미엄 비교" },
  );
}

/** 그림13: 비교대상 평당가 비교 (바) */
function c13(d: ScrReportData): string {
  const rows = d.priceAdequacy.adequacyOpinion.comparison;
  return barChart(
    rows.map((r) => r.target.length > 8 ? r.target.slice(0, 8) + ".." : r.target),
    [{ name: "평당가(만원/평)", values: rows.map((r) => r.pricePerPyeong), color: COLORS.primary }],
    { chartNo: 13, title: "주요 비교대상 평당가격" },
  );
}

/** 그림14: 사업비 구성 (파이) */
function c14(d: ScrReportData): string {
  const c = d.repaymentAnalysis.businessIncome.cost;
  const slices = [
    { label: "토지비", value: c.land, color: PALETTE[0] },
    { label: "직접공사비", value: c.directConstruction, color: PALETTE[1] },
    { label: "간접공사비", value: c.indirectConstruction, color: PALETTE[2] },
    { label: "분양경비", value: c.salesExpense, color: PALETTE[3] },
    { label: "일반관리비", value: c.generalAdmin, color: PALETTE[4] },
    { label: "제세공과금", value: c.tax, color: PALETTE[5] },
    { label: "PF 수수료+이자", value: c.pfFee + c.pfInterest, color: PALETTE[6] },
    { label: "중도금 이자", value: c.interimInterest, color: PALETTE[7] },
  ].filter((s) => s.value > 0);
  return pieChart(slices, { chartNo: 14, title: "사업비 구성" });
}

/** 그림15: 매출 세분도 (적층바) */
function c15(d: ScrReportData): string {
  const r = d.repaymentAnalysis.businessIncome.revenue;
  const labels = ["수입"];
  const series = [
    { name: "아파트", values: [r.apartment], color: PALETTE[0] },
    { name: "오피스텔", values: [r.officetel], color: PALETTE[1] },
    { name: "발코니확장", values: [r.balconyExpansion], color: PALETTE[2] },
    { name: "상가", values: [r.commercial], color: PALETTE[3] },
    { name: "중도금이자", values: [r.interimInterest], color: PALETTE[4] },
  ].filter((s) => s.values[0] > 0);
  return barChart(labels, series, { chartNo: 15, title: "매출 세분도", stacked: true });
}

/** 그림16: 시나리오별 세전이익 비교 (바) */
function c16(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.scenario.projections;
  return barChart(
    rows.map((r) => r.scenario),
    [{ name: "세전이익(만원)", values: rows.map((r) => r.profitBeforeTax), color: COLORS.primary }],
    { chartNo: 16, title: "시나리오별 세전이익 비교" },
  );
}

/** 그림17: 시나리오별 수익률 (바) */
function c17(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.scenario.projections;
  return barChart(
    rows.map((r) => r.scenario),
    [{ name: "수익률(%)", values: rows.map((r) => r.profitRate), color: COLORS.secondary }],
    { chartNo: 17, title: "시나리오별 수익률" },
  );
}

/** 그림18: 민감도 분석 (바) */
function c18(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.scenario.sensitivity;
  return barChart(
    rows.map((r) => r.variable),
    [{ name: "이익변동(만원)", values: rows.map((r) => r.profitImpact), color: COLORS.tertiary }],
    { chartNo: 18, title: "민감도 분석" },
  );
}

/** 그림19: 현금흐름 추이 (영역) — 시행사 */
function c19(d: ScrReportData): string {
  const rows = d.developerAnalysis.cashFlow;
  return areaChart(
    rows.map((r) => String(r.year)),
    [
      { name: "영업활동", values: rows.map((r) => r.operating), color: COLORS.primary },
      { name: "투자활동", values: rows.map((r) => r.investing), color: COLORS.tertiary },
      { name: "재무활동", values: rows.map((r) => r.financing), color: COLORS.secondary },
    ],
    { chartNo: 19, title: "시행사 현금흐름 추이" },
  );
}

/** 그림20: 수익성 추이 (라인) */
function c20(d: ScrReportData): string {
  const rows = d.developerAnalysis.profitability;
  return lineChart(
    rows.map((r) => String(r.year)),
    [
      { name: "매출", values: rows.map((r) => r.revenue), color: COLORS.primary },
      { name: "영업이익", values: rows.map((r) => r.operatingProfit), color: COLORS.secondary },
      { name: "당기순이익", values: rows.map((r) => r.netIncome), color: COLORS.tertiary },
    ],
    { chartNo: 20, title: "시행사 수익성 추이" },
  );
}

/** 그림21: 금리추이 (라인) — 부록 */
function c21(d: ScrReportData): string {
  const rows = d.appendices.interestRateTrend;
  if (rows.length === 0) return figureWrap(21, "금리 추이", svgOpen() + `<text x="300" y="150" text-anchor="middle" fill="${COLORS.muted}" font-size="10">데이터 없음</text>` + svgClose());
  return lineChart(
    rows.map((r) => r.yearMonth),
    [
      { name: "기준금리(%)", values: rows.map((r) => r.baseRate), color: COLORS.primary },
      { name: "주담대금리(%)", values: rows.map((r) => r.mortgageRate), color: COLORS.danger },
    ],
    { chartNo: 21, title: "금리 추이" },
  );
}

/** 그림22: 가격지수 추이 (라인) — 부록 */
function c22(d: ScrReportData): string {
  const rows = d.appendices.priceIndexTrend;
  if (rows.length === 0) return figureWrap(22, "부동산 가격지수 추이", svgOpen() + `<text x="300" y="150" text-anchor="middle" fill="${COLORS.muted}" font-size="10">데이터 없음</text>` + svgClose());
  return lineChart(
    rows.map((r) => r.yearMonth),
    [
      { name: "아파트지수", values: rows.map((r) => r.apartmentIndex), color: COLORS.primary },
      { name: "전세지수", values: rows.map((r) => r.jeonseIndex), color: COLORS.secondary },
    ],
    { chartNo: 22, title: "부동산 가격지수 추이" },
  );
}

/** 그림23: BEP 분양률 비교 (바) */
function c23(d: ScrReportData): string {
  const rows = d.repaymentAnalysis.bep.scenarioBep;
  return barChart(
    rows.map((r) => r.scenario),
    [
      { name: "BEP 분양률(%)", values: rows.map((r) => r.bepSaleRate), color: COLORS.primary },
      { name: "여유율(%p)", values: rows.map((r) => r.margin), color: COLORS.secondary },
    ],
    { chartNo: 23, title: "시나리오별 BEP 분양률" },
  );
}

// ─── 차트 렌더링 맵 ───

type ChartFn = (d: ScrReportData) => string;

const CHART_MAP: Record<number, ChartFn> = {
  1: c1, 2: c2, 3: c3, 4: c4, 5: c5, 6: c6, 7: c7,
  8: c8, 9: c9, 10: c10, 11: c11, 12: c12, 13: c13,
  14: c14, 15: c15, 16: c16, 17: c17, 18: c18,
  19: c19, 20: c20, 21: c21, 22: c22, 23: c23,
};

/** 장별 차트 번호 */
const CHAPTER_CHARTS: Record<1 | 2 | 3 | 4 | 5 | "appendix", number[]> = {
  1: [1],
  2: [19, 20],
  3: [3, 4, 5, 6, 7, 8, 9, 10, 11],
  4: [2, 12, 13],
  5: [14, 15, 16, 17, 18, 23],
  appendix: [21, 22],
};

// ─── 공개 API ───

/** 단일 차트 렌더링 */
export function renderChart(chartNumber: number, data: ScrReportData): string {
  const fn = CHART_MAP[chartNumber];
  if (!fn) return `<!-- 그림${chartNumber}: 미정의 -->`;
  return fn(data);
}

/** 장별 전체 차트 렌더링 */
export function renderAllCharts(chapter: 1 | 2 | 3 | 4 | 5 | "appendix", data: ScrReportData): string {
  const nums = CHAPTER_CHARTS[chapter] || [];
  return nums.map((n) => renderChart(n, data)).join("\n");
}
