import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKRW(amount: number, emptyLabel = "0원"): string {
  if (amount <= 0) return emptyLabel;
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.round((amount % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * 프로즈(AI 생성 텍스트) 안에 섞여 나오는 금액을 "1,234,567,890원 (12억 3,456만원)" 형태로 통일한다.
 * 천단위 콤마 + 괄호 안 한글(억/만원) 병기. 연도(2026)·개월·퍼센트처럼 금액이 아닌 수는 건드리지 않는다.
 * 대상: ①한글 금액(N억[ M만]원 / N만원) ②콤마 금액(N,NNN,NNN원) ③bare 큰 숫자(≥7자리, '원' 선택).
 * 단일 pass라 변환 결과가 재변환되지 않는다. bare는 ≥7자리(1천만↑)만 금액으로 간주해 오탐을 피한다.
 */
export function formatWonInText(text: string): string {
  if (!text) return text;
  const canonical = (won: number) => `${won.toLocaleString("en-US")}원 (${formatKRW(won)})`;
  const re = /(\d+)\s*억(?:\s*([\d,]+)\s*만)?\s*원|([\d,]+)\s*만\s*원|(\d{1,3}(?:,\d{3})+)\s*원|(\d{7,})\s*원?/g;
  return text.replace(re, (m, eok, eokMan, manOnly, commaWon, bareWon) => {
    let won: number;
    if (eok !== undefined) won = parseInt(eok, 10) * 100000000 + (eokMan ? parseInt(eokMan.replace(/,/g, ""), 10) * 10000 : 0);
    else if (manOnly !== undefined) won = parseInt(manOnly.replace(/,/g, ""), 10) * 10000;
    else if (commaWon !== undefined) won = parseInt(commaWon.replace(/,/g, ""), 10);
    else won = parseInt(bareWon, 10);
    if (!Number.isFinite(won) || won <= 0) return m;
    return canonical(won);
  });
}

/**
 * 시세전망 본론: 낙관/기본/비관 시나리오와 영향요인이 한 문단에 이어져 구분이 안 되는 문제를 해결.
 * 기본(base)·비관(pessimistic)·영향 요인별로 앞에 빈 줄을 넣어 시나리오별로 줄을 내린다
 * (낙관은 문단 첫머리라 그대로). 렌더 측 white-space: pre-line과 함께 쓴다.
 */
export function breakForecastScenarios(text: string): string {
  if (!text) return text;
  return text
    .replace(/\s*(기본\(base\)|비관\(pessimistic\)|영향\s*요인별로)/g, "\n\n$1")
    .replace(/^\n+/, "");
}
