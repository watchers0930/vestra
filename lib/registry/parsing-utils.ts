/**
 * 등기부등본 파싱 유틸리티
 *
 * 날짜/금액 추출, 권리 유형 분류, 말소 판별, 권리자 추출 등
 * 섹션 파서들이 공통으로 사용하는 함수와 상수를 포함합니다.
 *
 * @module lib/registry/parsing-utils
 */

import type { RiskType } from "../registry-parser";

// ─── 상수 ───

/** 갑구 권리 유형 → 위험도 매핑 */
export const GAPGU_RISK_MAP: Record<string, RiskType> = {
  소유권이전: "safe",
  소유권보존: "safe",
  가압류: "danger",
  압류: "danger",
  가처분: "danger",
  경매개시결정: "danger",
  임의경매개시결정: "danger",
  강제경매개시결정: "danger",
  신탁: "warning",
  신탁등기: "warning",
  가등기: "warning",
  소유권이전청구권가등기: "warning",
  환매등기: "warning",
  예고등기: "warning",
  가압류말소: "info",
  압류말소: "info",
  가처분말소: "info",
  가등기말소: "info",
};

/** 을구 권리 유형 → 위험도 매핑 */
export const EULGU_RISK_MAP: Record<string, RiskType> = {
  근저당권설정: "warning",
  저당권설정: "warning",
  전세권설정: "info",
  지상권설정: "info",
  지역권설정: "info",
  임차권등기: "info",
  임차권설정: "info",
  가압류: "danger",
  압류: "danger",
  가등기: "warning",
  전세권이전: "info",
  근저당권이전: "warning",
  근저당권변경: "warning",
  근저당권말소: "info",
  저당권말소: "info",
  전세권말소: "info",
  가압류말소: "info",
  압류말소: "info",
  가등기말소: "info",
};

// ─── 유틸리티 함수 ───

/** 다양한 한국 날짜 형식을 통일 포맷으로 변환 */
export function extractDate(text: string): string {
  const m1 = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m1) return `${m1[1]}.${m1[2].padStart(2, "0")}.${m1[3].padStart(2, "0")}`;

  const m2 = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (m2) return `${m2[1]}.${m2[2].padStart(2, "0")}.${m2[3].padStart(2, "0")}`;

  return "";
}

/** 금액 문자열에서 숫자 추출 (원 단위) */
export function extractAmount(text: string): number {
  const m1 = text.match(/금\s*([\d,]+)\s*원/);
  if (m1) return parseInt(m1[1].replace(/,/g, ""), 10);

  const m1b = text.match(/([\d,]{4,})\s*원/);
  if (m1b) return parseInt(m1b[1].replace(/,/g, ""), 10);

  const m2 = text.match(/금\s*(\d+)\s*억\s*([\d,]*)\s*만/);
  if (m2) {
    const eok = parseInt(m2[1], 10) * 100000000;
    const man = m2[2] ? parseInt(m2[2].replace(/,/g, ""), 10) * 10000 : 0;
    return eok + man;
  }

  const m3 = text.match(/금\s*(\d+)\s*억\s*원/);
  if (m3) return parseInt(m3[1], 10) * 100000000;

  const m4 = text.match(/금\s*([\d,]+)\s*만\s*원/);
  if (m4) return parseInt(m4[1].replace(/,/g, ""), 10) * 10000;

  const m5 = text.match(/([\d,]{7,})/);
  if (m5) return parseInt(m5[1].replace(/,/g, ""), 10);

  return 0;
}

/** 텍스트에서 권리 유형 키워드 매칭 */
export function classifyRightType(text: string, riskMap: Record<string, RiskType>): { type: string; risk: RiskType } {
  const sortedKeys = Object.keys(riskMap).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (text.includes(key)) {
      return { type: key, risk: riskMap[key] };
    }
  }
  return { type: "기타", risk: "info" };
}

/** 말소 여부 판별 */
export function isCancelled(text: string): boolean {
  return /말소|말소기준등기|말소회복|【말소】/.test(text);
}

/** 다른 항목 참조 말소인지 여부 */
export function isRefCancellation(text: string): boolean {
  return /\d+\s*번[가-힣\s\d,·()（）]{0,80}말소/.test(text) || /제\s*\d+\s*호[가-힣\s\d,·()（）]{0,80}말소/.test(text);
}

/** 집합건물의 반복적인 층별 면적 데이터를 압축 */
export function compressFloorData(text: string): string {
  return text.replace(
    /((?:(?:지하?\d*|\d+)층\s*[\d,.]+\s*㎡[\s,]*){5,})/g,
    (match) => {
      const floors = match.match(/(?:지하?\d*|\d+)층/g) || [];
      if (floors.length < 5) return match;
      return `[${floors[0]}~${floors[floors.length - 1]} 면적정보 ${floors.length}개층] `;
    },
  );
}

/** 면적 추출 */
export function extractArea(text: string): string {
  const m = text.match(/([\d.]+)\s*㎡/);
  return m ? `${m[1]}㎡` : "";
}

// ─── 섹션 분리 ───

export interface RawSections {
  titleRaw: string;
  gapguRaw: string;
  eulguRaw: string;
}

export function splitSections(text: string): RawSections {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ");

  function findIndex(patterns: RegExp[]): number {
    for (const p of patterns) {
      const m = normalized.search(p);
      if (m !== -1) return m;
    }
    return -1;
  }

  const titleIdx = findIndex([
    /【\s*표\s*제\s*부\s*】/,
    /\[\s*표\s*제\s*부\s*\]/,
    /표\s*제\s*부\s*[】\]（(]/,
    /표\s*제\s*부/,
  ]);

  const gapguIdx = findIndex([
    /【\s*갑\s*구\s*】\s*[（(]\s*소유권에/,
    /\[\s*갑\s*구\s*\]\s*[（(]\s*소유권에/,
    /【\s*갑\s*구\s*】/,
    /\[\s*갑\s*구\s*\]/,
    /갑\s*구\s*[（(]\s*소유권에/,
    /갑\s*구/,
  ]);

  const eulguIdx = findIndex([
    /【\s*을\s*구\s*】\s*[（(]\s*소유권\s*이외/,
    /\[\s*을\s*구\s*\]\s*[（(]\s*소유권\s*이외/,
    /【\s*을\s*구\s*】/,
    /\[\s*을\s*구\s*\]/,
    /을\s*구\s*[（(]\s*소유권\s*이외/,
    /을\s*구/,
  ]);

  const titleRaw = titleIdx !== -1 && gapguIdx !== -1
    ? normalized.slice(titleIdx, gapguIdx)
    : titleIdx !== -1
      ? normalized.slice(titleIdx, gapguIdx !== -1 ? gapguIdx : eulguIdx !== -1 ? eulguIdx : undefined)
      : "";

  const gapguRaw = gapguIdx !== -1
    ? normalized.slice(gapguIdx, eulguIdx !== -1 ? eulguIdx : undefined)
    : "";

  const eulguRaw = eulguIdx !== -1
    ? normalized.slice(eulguIdx)
    : "";

  return { titleRaw, gapguRaw, eulguRaw };
}

// ─── 줄바꿈 정규화 ───

/** 줄바꿈 없는 등기부등본 텍스트에 논리적 줄바꿈 삽입 */
export function normalizeRegistryNewlines(text: string): string {
  let r = text;
  r = r.replace(/(【\s*[표갑을])/g, "\n$1");
  r = r.replace(/\s+(순위번호\s)/g, "\n$1");
  r = r.replace(/\s+(\d+\s+(?:소유권보존|소유권이전|가압류|압류|가처분|경매개시결정|임의경매|강제경매|신탁|가등기|예고등기|환매등기|근저당권설정|저당권설정|전세권설정|임차권등기|임차권설정|근저당권이전|근저당권변경|전세권이전))/g, "\n$1");
  r = r.replace(/\s+(\d+\s*번[가-힣\s\d,·()（）]{0,20}말소)/g, "\n$1");
  r = r.replace(/\s+(\d+\s+(?:근저당권말소|저당권말소|전세권말소|가압류말소|압류말소|가처분말소|가등기말소|\d+\s*번[가-힣\s\d,·()（）]{0,20}말소))/g, "\n$1");
  r = r.replace(/\s+(\d+\s*번[가-힣\s\d,·()（）]*기말소)/g, "\n$1");
  r = r.replace(/\s+(\(\s*(?:전유부분|1동|대지권))/g, "\n$1");
  r = r.replace(/\s+(표시번호\s)/g, "\n$1");
  return r;
}

// ─── 이름 추출 ───

/** 권리자/소유자 이름 추출 */
export function extractHolder(text: string): string {
  const corpSuffix = "은행|보험|저축은행|캐피탈|신용협동조합|신탁|증권|자산관리|공사|조합|재단|학교법인|종교법인|사단법인|재단법인|유한회사|합자회사|합명회사|주식회사";
  const corpPatterns: RegExp[] = [
    new RegExp(`([（(]주[)）]|㈜)\\s*([가-힣A-Za-z0-9·]{1,20}(?:${corpSuffix})?[가-힣A-Za-z0-9·]*)`),
    new RegExp(`(주식회사)\\s+([가-힣A-Za-z0-9·]+(?:\\s+[가-힣A-Za-z0-9·]+)?)`),
    new RegExp(`([가-힣A-Za-z0-9·]{1,15}(?:${corpSuffix})(?:주식회사|유한회사|합자회사|합명회사)?)`),
  ];
  for (let i = 0; i < corpPatterns.length; i++) {
    const m = text.match(corpPatterns[i]);
    if (m) {
      let name: string;
      if (i === 1 && m[2]) {
        name = (m[1] + " " + m[2]).trim().replace(/\s{2,}.*$/, "");
      } else {
        name = (m[2] ? (m[1] + m[2]) : m[1]).trim().replace(/\s{2,}.*$/, "");
      }
      if (name.length >= 2) return name;
    }
  }

  const keywordMatch = text.match(
    /(?:권리자|소유자|채무자|채권자|근저당권자|저당권자|임차인|임대인|전세권자|지상권자)\s*[:：]?\s*([가-힣]{2,5})/
  );
  if (keywordMatch) return keywordMatch[1];

  const idMatch = text.match(/([가-힣]{2,5})\s*(?:\d{6}[-–]\d{7}|\d{6}[-–]\*{7}|\d{6}|\d{2}년\s*\d{1,2}월)/);
  if (idMatch) return idMatch[1];

  const parenMatch = text.match(/([가-힣]{2,5})\s*[（(]/);
  if (parenMatch) return parenMatch[1];

  const standaloneMatch = text.match(/(?:^|\s{2,})([가-힣]{2,5})(?:\s{2,}|$)/);
  if (standaloneMatch) return standaloneMatch[1];

  return "";
}
