/**
 * SCR 보고서 전체 HTML 조립 메인 렌더러
 *
 * 순수 문자열 반환 — 서버사이드에서 호출 가능합니다.
 * getScrReportCSS, renderAllTables, renderAllCharts 를 조합하여
 * 완전한 A4 인쇄용 HTML 문서를 생성합니다.
 */

import type { ScrReportData } from "./scr-types";
import { getScrReportCSS } from "./scr-report-css";
import { renderTable, renderAllTables } from "./scr-report-tables";
import { renderChart, renderAllCharts } from "./scr-report-charts";

// ─── 유틸 ───

/** HTML 이스케이프 */
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 날짜 포맷 (YYYY.MM.DD) */
function fmtDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// ─── 전문부 ───

/** 표지 페이지 */
function renderCoverPage(d: ScrReportData): string {
  const fm = d.frontMatter;
  return `
<div class="cover-page">
  <div class="cover-line"></div>
  <p class="report-title">SCR 분석보고서</p>
  <p class="report-subtitle">${esc(fm.projectName)}</p>
  <div class="cover-line"></div>
  <div class="cover-meta">
    <p>보고서번호: ${esc(fm.reportNumber)}</p>
    <p>시행사: ${esc(fm.developer)}</p>
    <p>분석담당: ${esc(fm.analyst)}</p>
    <p>발행일: ${fmtDate(fm.date)}</p>
  </div>
  <div class="cover-line"></div>
  <p style="font-size:8pt; color:#86868b; margin-top:40pt;">VESTRA AI 자산관리 플랫폼</p>
</div>`;
}

/** 면책조항 페이지 */
function renderDisclaimerPage(d: ScrReportData): string {
  return `
<div class="disclaimer-page page-break">
  <h2>면책조항</h2>
  <p>${esc(d.frontMatter.disclaimer || d.metadata.disclaimer)}</p>
  <p style="margin-top:20pt;">분석담당자: ${esc(d.frontMatter.analyst)}</p>
  <p>보고서 버전: ${esc(d.metadata.version)}</p>
  <p>생성일시: ${fmtDate(d.metadata.generatedAt)}</p>
</div>`;
}

/** 목차 항목 */
function tocEntry(label: string, isChapter = false): string {
  const cls = isChapter ? "toc-entry toc-chapter" : "toc-entry";
  return `<div class="${cls}"><span class="toc-label">${label}</span><span class="toc-dots"></span><span class="toc-page-num"></span></div>`;
}

/** 전체 목차 */
function renderMainTOC(): string {
  return `
<div class="toc-page page-break">
  <h2>목 차</h2>
  ${tocEntry("I. 사업개요", true)}
  ${tocEntry("&nbsp;&nbsp;1. 사업개요")}
  ${tocEntry("&nbsp;&nbsp;2. 사업구조")}
  ${tocEntry("&nbsp;&nbsp;3. 사업일정")}
  ${tocEntry("&nbsp;&nbsp;4. 타입별 분양가")}
  ${tocEntry("&nbsp;&nbsp;5. 분양대금 납입일정")}
  ${tocEntry("&nbsp;&nbsp;6. 자금조달 계획")}
  ${tocEntry("&nbsp;&nbsp;7. 매입토지 현황")}
  ${tocEntry("II. 사업주체 분석", true)}
  ${tocEntry("&nbsp;&nbsp;1. 회사개요")}
  ${tocEntry("&nbsp;&nbsp;2. 주주현황")}
  ${tocEntry("&nbsp;&nbsp;3. 진행중 사업현장")}
  ${tocEntry("&nbsp;&nbsp;4. 재무분석")}
  ${tocEntry("&nbsp;&nbsp;5. 현금흐름")}
  ${tocEntry("III. 시장 환경 분석", true)}
  ${tocEntry("&nbsp;&nbsp;1. 인구·세대 현황")}
  ${tocEntry("&nbsp;&nbsp;2. 주택시장 분석")}
  ${tocEntry("&nbsp;&nbsp;3. 공급·미분양 동향")}
  ${tocEntry("IV. 분양가 적정성 검토", true)}
  ${tocEntry("&nbsp;&nbsp;1. 입지여건")}
  ${tocEntry("&nbsp;&nbsp;2. 시세·분양가 비교")}
  ${tocEntry("&nbsp;&nbsp;3. 적정성 의견")}
  ${tocEntry("V. 원리금상환가능성 분석", true)}
  ${tocEntry("&nbsp;&nbsp;1. 사업수지")}
  ${tocEntry("&nbsp;&nbsp;2. 시나리오 분석")}
  ${tocEntry("&nbsp;&nbsp;3. BEP 분석")}
  ${tocEntry("부록", true)}
</div>`;
}

/** 표 목차 */
function renderTableTOC(): string {
  const titles: Record<number, string> = {
    1: "사업개요", 2: "사업일정", 3: "타입별 분양가 (확장비 미포함)", 4: "타입별 분양가 (확장비 포함)",
    5: "분양대금 납입일정", 6: "자금조달 계획", 7: "매입토지 현황",
    8: "시행사 회사개요", 9: "주주현황", 10: "진행중 공사현장", 11: "수주잔고 추이",
    12: "수익성 지표 추이", 13: "재무안정성", 14: "유동성 분석", 15: "차입금 현황", 16: "현금흐름 추이",
    17: "인구수·세대수 추이", 18: "연령대별 인구분포", 19: "산업별 종사자 현황",
    20: "주택보급률 및 주택구성", 21: "주택거래량 추이", 22: "유형별 주택분포",
    23: "건축연령별 주택 현황", 24: "면적별 주택공급 현황", 25: "입주예정 단지 목록",
    26: "입주예정 단지 상세", 27: "분양예정 단지", 28: "미분양 추이", 29: "미분양 단지 현황",
    30: "입지여건 분석", 31: "인근 개발계획", 32: "지역 시세·분양가 추이",
    33: "인근 매매사례", 34: "인근 매매사례 상세", 35: "인근 분양사례", 36: "인근 분양사례 상세",
    37: "분양사례 프리미엄 분석", 38: "본건 계획 분양가", 39: "주요 비교대상 평당가격",
    40: "기간별 분양률", 41: "사업수지", 42: "주요 자금흐름 요약", 43: "자금조달 규모",
    44: "월별 자금수지 (1)", 45: "월별 자금수지 (2)", 46: "월별 자금수지 (3)",
    47: "시나리오별 분양률 조건", 48: "시나리오별 사업수지", 49: "민감도 분석",
    50: "PF 원리금 상환 BEP", 51: "사업비 전체 BEP", 52: "시나리오별 BEP 요약",
    53: "부동산 정책 히스토리 (1)", 54: "부동산 정책 히스토리 (2)", 55: "대출 규제 현황",
    56: "규제지역 (1)", 57: "규제지역 (2)", 58: "규제지역 (3)", 59: "HUG 보증 지역",
    60: "인근 개발 상세 (1)", 61: "인근 개발 상세 (2)", 62: "인근 개발 상세 (3)",
    63: "인근 개발 상세 (4)", 64: "인근 개발 상세 (5)",
  };

  let entries = "";
  for (let i = 1; i <= 64; i++) {
    entries += tocEntry(`표${i}: ${titles[i] || ""}`);
  }
  return `
<div class="toc-page page-break">
  <h2>표 목차</h2>
  ${entries}
</div>`;
}

/** 그림 목차 */
function renderFigureTOC(): string {
  const titles: Record<number, string> = {
    1: "사업 구조도", 2: "지역 시세·분양가 추이", 3: "인구수 추이", 4: "세대수 추이",
    5: "연령대별 인구분포", 6: "주택보급률 추이", 7: "유형별 주택 구성", 8: "건축연령별 주택 현황",
    9: "입주예정 공급량", 10: "미분양 추이", 11: "주택거래량 추이", 12: "분양사례 프리미엄 비교",
    13: "주요 비교대상 평당가격", 14: "사업비 구성", 15: "매출 세분도",
    16: "시나리오별 세전이익 비교", 17: "시나리오별 수익률", 18: "민감도 분석",
    19: "시행사 현금흐름 추이", 20: "시행사 수익성 추이",
    21: "금리 추이", 22: "부동산 가격지수 추이", 23: "시나리오별 BEP 분양률",
  };

  let entries = "";
  for (let i = 1; i <= 23; i++) {
    entries += tocEntry(`그림${i}: ${titles[i] || ""}`);
  }
  return `
<div class="toc-page page-break">
  <h2>그림 목차</h2>
  ${entries}
</div>`;
}

/** 부록 목차 */
function renderAppendixTOC(): string {
  return `
<div class="toc-page page-break">
  <h2>부록 목차</h2>
  ${tocEntry("부록 A. 부동산 정책 히스토리")}
  ${tocEntry("부록 B. 대출 규제 현황")}
  ${tocEntry("부록 C. 규제지역 현황")}
  ${tocEntry("부록 D. HUG 보증 지역")}
  ${tocEntry("부록 E. 인근 개발 상세")}
  ${tocEntry("부록 F. 금리 추이")}
  ${tocEntry("부록 G. 부동산 가격지수 추이")}
</div>`;
}

// ─── 장별 본문 ───

/** I장: 사업개요 */
function renderChapterI(d: ScrReportData): string {
  return `
<div class="page-break">
  <h2 class="chapter-title">I. 사업개요</h2>
  <h3 class="section-title">1. 사업개요</h3>
  ${renderTable(1, d)}
  <h3 class="section-title">2. 사업 구조도</h3>
  ${renderChart(1, d)}
  <h3 class="section-title">3. 사업일정</h3>
  ${renderTable(2, d)}
  <h3 class="section-title">4. 타입별 분양가</h3>
  ${renderTable(3, d)}
  ${renderTable(4, d)}
  <h3 class="section-title">5. 분양대금 납입일정</h3>
  ${renderTable(5, d)}
  <h3 class="section-title">6. 자금조달 계획</h3>
  ${renderTable(6, d)}
  <h3 class="section-title">7. 매입토지 현황</h3>
  ${renderTable(7, d)}
</div>`;
}

/** II장: 사업주체 분석 */
function renderChapterII(d: ScrReportData): string {
  return `
<div class="page-break">
  <h2 class="chapter-title">II. 사업주체 분석</h2>
  <h3 class="section-title">1. 회사개요</h3>
  ${renderTable(8, d)}
  <h3 class="section-title">2. 주주현황</h3>
  ${renderTable(9, d)}
  <h3 class="section-title">3. 진행중 사업현장</h3>
  ${renderTable(10, d)}
  <h3 class="section-title">4. 수주잔고 추이</h3>
  ${renderTable(11, d)}
  <h3 class="section-title">5. 수익성 분석</h3>
  ${renderTable(12, d)}
  ${renderChart(20, d)}
  <h3 class="section-title">6. 재무안정성</h3>
  ${renderTable(13, d)}
  <h3 class="section-title">7. 유동성 분석</h3>
  ${renderTable(14, d)}
  <h3 class="section-title">8. 차입금 현황</h3>
  ${renderTable(15, d)}
  <h3 class="section-title">9. 현금흐름</h3>
  ${renderTable(16, d)}
  ${renderChart(19, d)}
</div>`;
}

/** III장: 시장 환경 분석 */
function renderChapterIII(d: ScrReportData): string {
  return `
<div class="page-break">
  <h2 class="chapter-title">III. 시장 환경 분석</h2>

  <h3 class="section-title">1. 부동산 규제 요약</h3>
  <div class="scr-highlight">
    <p>${esc(d.marketAnalysis.regulations.summary)}</p>
  </div>

  <h3 class="section-title">2. 인구·세대 현황</h3>
  ${renderTable(17, d)}
  ${renderChart(3, d)}
  ${renderChart(4, d)}
  ${renderTable(18, d)}
  ${renderChart(5, d)}
  ${renderTable(19, d)}

  <h3 class="section-title">3. 주택시장 분석</h3>
  ${renderTable(20, d)}
  ${renderChart(6, d)}
  ${renderTable(21, d)}
  ${renderChart(11, d)}
  ${renderTable(22, d)}
  ${renderChart(7, d)}
  ${renderTable(23, d)}
  ${renderChart(8, d)}
  ${renderTable(24, d)}

  <h3 class="section-title">4. 공급 동향</h3>
  ${renderTable(25, d)}
  ${renderTable(26, d)}
  ${renderChart(9, d)}
  ${renderTable(27, d)}

  <h3 class="section-title">5. 미분양 동향</h3>
  ${renderTable(28, d)}
  ${renderChart(10, d)}
  ${renderTable(29, d)}
</div>`;
}

/** IV장: 분양가 적정성 검토 */
function renderChapterIV(d: ScrReportData): string {
  return `
<div class="page-break">
  <h2 class="chapter-title">IV. 분양가 적정성 검토</h2>

  <h3 class="section-title">1. 입지여건</h3>
  ${renderTable(30, d)}
  <p class="scr-paragraph">${esc(d.priceAdequacy.location.summary)}</p>

  <h3 class="section-title">2. 인근 개발계획</h3>
  ${renderTable(31, d)}

  <h3 class="section-title">3. 시설개요 및 특성</h3>
  <p class="scr-paragraph">${esc(d.priceAdequacy.facilityOverview)}</p>

  <h3 class="section-title">4. 시세·분양가 추이</h3>
  ${renderTable(32, d)}
  ${renderChart(2, d)}

  <h3 class="section-title">5. 인근 매매사례</h3>
  ${renderTable(33, d)}
  ${renderTable(34, d)}

  <h3 class="section-title">6. 인근 분양사례</h3>
  ${renderTable(35, d)}
  ${renderTable(36, d)}

  <h3 class="section-title">7. 프리미엄 분석</h3>
  ${renderTable(37, d)}
  ${renderChart(12, d)}

  <h3 class="section-title">8. 적정성 의견</h3>
  ${renderTable(38, d)}
  ${renderTable(39, d)}
  ${renderChart(13, d)}
  <div class="scr-conclusion">
    <p><strong>적정성 종합 의견:</strong> ${esc(d.priceAdequacy.adequacyOpinion.conclusion)}</p>
  </div>
</div>`;
}

/** V장: 원리금상환가능성 분석 */
function renderChapterV(d: ScrReportData): string {
  return `
<div class="page-break">
  <h2 class="chapter-title">V. 원리금상환가능성 분석</h2>

  <h3 class="section-title">1. 전제사항</h3>
  <p class="scr-paragraph">${esc(d.repaymentAnalysis.assumptions)}</p>

  <h3 class="section-title">2. 기간별 분양률</h3>
  ${renderTable(40, d)}

  <h3 class="section-title">3. 사업수지</h3>
  ${renderTable(41, d)}
  ${renderChart(14, d)}
  ${renderChart(15, d)}

  <h3 class="section-title">4. 자금흐름</h3>
  ${renderTable(42, d)}
  ${renderTable(43, d)}

  <h3 class="section-title">5. 월별 자금수지</h3>
  ${renderTable(44, d)}
  ${renderTable(45, d)}
  ${renderTable(46, d)}

  <h3 class="section-title">6. 시나리오 분석</h3>
  ${renderTable(47, d)}
  ${renderTable(48, d)}
  ${renderChart(16, d)}
  ${renderChart(17, d)}

  <h3 class="section-title">7. 민감도 분석</h3>
  ${renderTable(49, d)}
  ${renderChart(18, d)}

  <h3 class="section-title">8. BEP 분석</h3>
  ${renderTable(50, d)}
  ${renderTable(51, d)}
  ${renderTable(52, d)}
  ${renderChart(23, d)}
</div>`;
}

/** 부록 */
function renderAppendices(d: ScrReportData): string {
  return `
<div class="page-break">
  <h2 class="appendix-title">부록</h2>

  <h3 class="section-title">A. 부동산 정책 히스토리</h3>
  ${renderTable(53, d)}
  ${renderTable(54, d)}

  <h3 class="section-title">B. 대출 규제 현황</h3>
  ${renderTable(55, d)}

  <h3 class="section-title">C. 규제지역 현황</h3>
  ${renderTable(56, d)}
  ${renderTable(57, d)}
  ${renderTable(58, d)}

  <h3 class="section-title">D. HUG 보증 지역</h3>
  ${renderTable(59, d)}

  <h3 class="section-title">E. 인근 개발 상세</h3>
  ${renderTable(60, d)}
  ${renderTable(61, d)}
  ${renderTable(62, d)}
  ${renderTable(63, d)}
  ${renderTable(64, d)}

  <h3 class="section-title">F. 금리 추이</h3>
  ${renderChart(21, d)}

  <h3 class="section-title">G. 부동산 가격지수 추이</h3>
  ${renderChart(22, d)}
</div>`;
}

// ─── 공개 API ───

/** SCR 보고서 전체 HTML 렌더링 */
export function renderScrReportHTML(data: ScrReportData): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>SCR 분석보고서 — ${esc(data.frontMatter.projectName)}</title>
<style>${getScrReportCSS()}</style>
</head>
<body data-report-number="${esc(data.frontMatter.reportNumber)}">
${renderCoverPage(data)}
${renderDisclaimerPage(data)}
${renderMainTOC()}
${renderTableTOC()}
${renderFigureTOC()}
${renderAppendixTOC()}
${renderChapterI(data)}
${renderChapterII(data)}
${renderChapterIII(data)}
${renderChapterIV(data)}
${renderChapterV(data)}
${renderAppendices(data)}
</body>
</html>`;
}
