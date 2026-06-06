/**
 * SCR 보고서 64개 표 HTML 렌더링 모듈
 *
 * 모든 함수는 순수 HTML 문자열을 반환합니다 (서버사이드 호출 가능).
 * Recharts / React 미사용.
 *
 * @module lib/feasibility/scr-report-tables
 */

import type { ScrReportData } from "./scr-types";

// ─── 표 렌더링 함수 import ───
import {
  t1, t2, t3, t4, t5, t6, t7,
  t8, t9, t10, t11, t12, t13, t14, t15, t16,
  t17, t18, t19, t20, t21, t22, t23, t24,
  t25, t26, t27, t28, t29,
} from "./scr-tables-figures";

import {
  t30, t31, t32, t33, t34, t35, t36, t37, t38, t39,
  t40, t41, t42, t43, t44, t45, t46,
  t47, t48, t49, t50, t51, t52,
  t53, t54, t55, t56, t57, t58, t59,
  t60, t61, t62, t63, t64,
} from "./scr-tables-analysis";

// ─── re-export (기존 import 경로 유지) ───
export {
  fmt, pct, safe, tableOpen, tableClose, thead,
  tbodyOpen, tbodyClose, tr, kvRow,
} from "./scr-table-utils";

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
