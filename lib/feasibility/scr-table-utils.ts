/**
 * SCR 표 렌더링 공용 헬퍼
 *
 * 천단위 포맷, 퍼센트 포맷, HTML 표 구조 생성 등
 * scr-tables-*.ts에서 공통으로 사용합니다.
 *
 * @module lib/feasibility/scr-table-utils
 */

/** 천단위 콤마 포맷 */
export function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return v.toLocaleString("ko-KR");
}

/** 퍼센트 포맷 */
export function pct(v: number | null | undefined, d = 1): string {
  if (v === null || v === undefined) return "-";
  return `${v.toFixed(d)}%`;
}

/** 빈 셀 */
export function safe(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

/** 표 캡션 + 래퍼 시작 */
export function tableOpen(no: number, title: string): string {
  return `<div class="scr-table-wrap avoid-break">
<p class="scr-table-caption">표${no}: ${title}</p>
<table class="scr-table">`;
}

/** 표 래퍼 닫기 */
export function tableClose(): string {
  return `</table></div>`;
}

/** thead 한 줄 */
export function thead(headers: string[]): string {
  return `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
}

/** tbody 시작/끝 */
export function tbodyOpen(): string { return "<tbody>"; }
export function tbodyClose(): string { return "</tbody>"; }

/** 일반 행 */
export function tr(cells: { v: string; cls?: string }[]): string {
  return `<tr>${cells.map((c) => `<td${c.cls ? ` class="${c.cls}"` : ""}>${c.v}</td>`).join("")}</tr>`;
}

/** 키-값 2열 행 (사업개요 등) */
export function kvRow(label: string, value: string): string {
  return `<tr><td class="label">${label}</td><td class="num">${value}</td></tr>`;
}
