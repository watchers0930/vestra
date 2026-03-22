/**
 * SCR A4 보고서 스타일시트
 *
 * 순수 문자열 반환 — 서버사이드에서 <style> 태그 안에 삽입하여 사용합니다.
 */

/** A4 보고서 전체 CSS 반환 */
export function getScrReportCSS(): string {
  return `
/* ── 페이지 설정 ── */
@page {
  size: 210mm 297mm;
  margin: 20mm;
  @top-left {
    content: "SCR 분석보고서";
    font-size: 8pt;
    color: #86868b;
    font-family: "Malgun Gothic", "맑은 고딕", sans-serif;
  }
  @top-right {
    content: attr(data-report-number);
    font-size: 8pt;
    color: #86868b;
  }
  @bottom-center {
    content: counter(page) " / " counter(pages);
    font-size: 8pt;
    color: #86868b;
  }
}

/* ── 기본 ── */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
  font-size: 9pt;
  line-height: 1.5;
  color: #1d1d1f;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── 페이지 나누기 ── */
.page-break {
  page-break-before: always;
  break-before: page;
}

.avoid-break {
  page-break-inside: avoid;
  break-inside: avoid;
}

/* ── 표지 ── */
.cover-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
  page-break-after: always;
}

.cover-page .report-title {
  font-size: 28pt;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 12pt;
  letter-spacing: -0.5pt;
}

.cover-page .report-subtitle {
  font-size: 14pt;
  color: #6e6e73;
  margin-bottom: 40pt;
}

.cover-page .cover-meta {
  font-size: 10pt;
  color: #86868b;
  line-height: 2;
}

.cover-page .cover-line {
  width: 60mm;
  height: 1px;
  background: #d2d2d7;
  margin: 20pt auto;
}

/* ── 면책조항 페이지 ── */
.disclaimer-page {
  page-break-after: always;
  padding: 30mm 10mm;
}

.disclaimer-page h2 {
  font-size: 14pt;
  font-weight: 700;
  margin-bottom: 16pt;
  color: #1d1d1f;
}

.disclaimer-page p {
  font-size: 9pt;
  line-height: 1.8;
  color: #6e6e73;
  margin-bottom: 8pt;
}

/* ── 목차 ── */
.toc-page {
  page-break-after: always;
}

.toc-page h2 {
  font-size: 16pt;
  font-weight: 700;
  margin-bottom: 20pt;
  color: #1d1d1f;
  border-bottom: 2px solid #1d1d1f;
  padding-bottom: 8pt;
}

.toc-entry {
  display: flex;
  align-items: baseline;
  margin-bottom: 4pt;
  font-size: 9.5pt;
}

.toc-entry.toc-chapter {
  font-weight: 700;
  font-size: 10.5pt;
  margin-top: 8pt;
}

.toc-entry .toc-label {
  white-space: nowrap;
}

.toc-entry .toc-dots {
  flex: 1;
  border-bottom: 1px dotted #d2d2d7;
  margin: 0 6pt;
  min-width: 20pt;
}

.toc-entry .toc-page-num {
  white-space: nowrap;
  color: #86868b;
  font-variant-numeric: tabular-nums;
}

/* ── 섹션 제목 ── */
.chapter-title {
  font-size: 14pt;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 16pt;
  padding-bottom: 6pt;
  border-bottom: 2px solid #0071e3;
}

.section-title {
  font-size: 11pt;
  font-weight: 700;
  color: #1d1d1f;
  margin-top: 14pt;
  margin-bottom: 8pt;
}

.sub-section-title {
  font-size: 10pt;
  font-weight: 600;
  color: #424245;
  margin-top: 10pt;
  margin-bottom: 6pt;
}

/* ── 표 ── */
.scr-table-wrap {
  margin-bottom: 14pt;
  page-break-inside: avoid;
}

.scr-table-caption {
  font-size: 9pt;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 4pt;
}

.scr-table-source {
  font-size: 7.5pt;
  color: #86868b;
  margin-top: 2pt;
  text-align: right;
}

table.scr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5pt;
  line-height: 1.4;
}

table.scr-table thead th {
  background: #f5f5f7;
  font-weight: 600;
  color: #6e6e73;
  text-align: center;
  padding: 6px 10px;
  border: 1px solid #d2d2d7;
  white-space: nowrap;
}

table.scr-table tbody td {
  padding: 6px 10px;
  border: 1px solid #e5e5e7;
  vertical-align: middle;
}

table.scr-table tbody tr:nth-child(even) {
  background: #fafafa;
}

table.scr-table tbody td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-family: "Malgun Gothic", monospace;
}

table.scr-table tbody td.pct {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

table.scr-table tbody td.label {
  font-weight: 500;
  color: #424245;
}

table.scr-table tbody td.empty {
  text-align: center;
  color: #86868b;
}

table.scr-table tfoot td {
  font-weight: 700;
  background: #f0f0f2;
  border: 1px solid #d2d2d7;
  padding: 6px 10px;
}

/* ── 그림 (차트) ── */
.scr-figure {
  margin: 14pt 0;
  text-align: center;
  page-break-inside: avoid;
}

.scr-figure svg {
  max-width: 100%;
  height: auto;
}

.scr-figure-caption {
  font-size: 8.5pt;
  color: #6e6e73;
  margin-top: 6pt;
  text-align: center;
}

/* ── 본문 텍스트 ── */
.scr-paragraph {
  font-size: 9pt;
  line-height: 1.7;
  color: #1d1d1f;
  margin-bottom: 8pt;
  text-align: justify;
}

.scr-highlight {
  background: #fffbe6;
  padding: 8pt 12pt;
  border-left: 3px solid #ff9500;
  margin: 10pt 0;
  font-size: 9pt;
  line-height: 1.6;
}

.scr-conclusion {
  background: #f0f7ff;
  padding: 12pt 16pt;
  border-left: 3px solid #0071e3;
  margin: 14pt 0;
  font-size: 9.5pt;
  line-height: 1.7;
}

/* ── 부록 ── */
.appendix-title {
  font-size: 13pt;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 12pt;
  padding-bottom: 4pt;
  border-bottom: 1.5px solid #86868b;
}

/* ── 인쇄 최적화 ── */
@media print {
  body { background: #fff; }
  .page-break { page-break-before: always; }
  .avoid-break { page-break-inside: avoid; }
  .no-print { display: none !important; }
}
`.trim();
}
