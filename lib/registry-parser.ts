/**
 * VESTRA 등기부등본 자동 파싱 엔진
 * ─────────────────────────────────
 * 순수 TypeScript 구현. AI/LLM 호출 없음.
 * 정규식 패턴 매칭 + 키워드 분류로 등기부등본 원문을 구조화된 데이터로 변환.
 *
 * 지원 형식: 인터넷등기소 텍스트, 법원등기 텍스트, OCR 추출 텍스트
 */

// ─── 타입 정의 ───

export interface TitleSection {
  address: string;
  buildingDetail: string;
  area: string;
  structure: string;
  purpose: string;
  landRightRatio: string;
}

export interface GapguEntry {
  order: number;
  date: string;
  purpose: string;
  detail: string;
  holder: string;
  isCancelled: boolean;
  riskType: RiskType;
}

export interface EulguEntry {
  order: number;
  date: string;
  purpose: string;
  detail: string;
  amount: number;
  holder: string;
  isCancelled: boolean;
  riskType: RiskType;
}

export type RiskType = "danger" | "warning" | "safe" | "info";

export interface ParseSummary {
  totalGapguEntries: number;
  totalEulguEntries: number;
  activeGapguEntries: number;
  activeEulguEntries: number;
  cancelledEntries: number;
  totalMortgageAmount: number;
  totalJeonseAmount: number;
  hasSeizure: boolean;
  hasProvisionalSeizure: boolean;
  hasProvisionalDisposition: boolean;
  hasAuctionOrder: boolean;
  hasTrust: boolean;
  hasProvisionalRegistration: boolean;
  hasLeaseRegistration: boolean;
  hasWarningRegistration: boolean;
  hasRedemptionRegistration: boolean;
  ownershipTransferCount: number;
  totalClaimsAmount: number;
}

export interface ParsedRegistry {
  title: TitleSection;
  gapgu: GapguEntry[];
  eulgu: EulguEntry[];
  summary: ParseSummary;
  rawText: string;
}

// ─── 상수 ───

/** 갑구 권리 유형 → 위험도 매핑 */
const GAPGU_RISK_MAP: Record<string, RiskType> = {
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
};

/** 을구 권리 유형 → 위험도 매핑 */
const EULGU_RISK_MAP: Record<string, RiskType> = {
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
};

// ─── 유틸리티 함수 ───

/** 다양한 한국 날짜 형식을 통일 포맷으로 변환 */
function extractDate(text: string): string {
  // "2023년 5월 15일", "2023년05월15일"
  const m1 = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m1) return `${m1[1]}.${m1[2].padStart(2, "0")}.${m1[3].padStart(2, "0")}`;

  // "2023.05.15", "2023-05-15"
  const m2 = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (m2) return `${m2[1]}.${m2[2].padStart(2, "0")}.${m2[3].padStart(2, "0")}`;

  return "";
}

/** 금액 문자열에서 숫자 추출 (원 단위) */
export function extractAmount(text: string): number {
  // "금 420,000,000원" → 420000000
  const m1 = text.match(/금\s*([\d,]+)\s*원/);
  if (m1) return parseInt(m1[1].replace(/,/g, ""), 10);

  // "금XXX,XXX,XXX원" (공백 없는 경우)
  const m1b = text.match(/([\d,]{4,})\s*원/);
  if (m1b) return parseInt(m1b[1].replace(/,/g, ""), 10);

  // "채권최고액 금3억5,000만원" → 350000000
  const m2 = text.match(/금\s*(\d+)\s*억\s*([\d,]*)\s*만/);
  if (m2) {
    const eok = parseInt(m2[1], 10) * 100000000;
    const man = m2[2] ? parseInt(m2[2].replace(/,/g, ""), 10) * 10000 : 0;
    return eok + man;
  }

  // "금3억원"
  const m3 = text.match(/금\s*(\d+)\s*억\s*원/);
  if (m3) return parseInt(m3[1], 10) * 100000000;

  // "금5,000만원"
  const m4 = text.match(/금\s*([\d,]+)\s*만\s*원/);
  if (m4) return parseInt(m4[1].replace(/,/g, ""), 10) * 10000;

  // 숫자만 있는 경우 (최소 6자리 이상)
  const m5 = text.match(/([\d,]{7,})/);
  if (m5) return parseInt(m5[1].replace(/,/g, ""), 10);

  return 0;
}

/** 텍스트에서 권리 유형 키워드 매칭 */
function classifyRightType(text: string, riskMap: Record<string, RiskType>): { type: string; risk: RiskType } {
  // 길이가 긴 키워드부터 매칭 (더 구체적인 것 우선)
  const sortedKeys = Object.keys(riskMap).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (text.includes(key)) {
      return { type: key, risk: riskMap[key] };
    }
  }

  return { type: "기타", risk: "info" };
}

/** 말소 여부 판별 */
function isCancelled(text: string): boolean {
  return /말소|말소기준등기|말소회복/.test(text);
}

/** 면적 추출 */
function extractArea(text: string): string {
  const m = text.match(/([\d.]+)\s*㎡/);
  return m ? `${m[1]}㎡` : "";
}

/** 권리자/소유자 이름 추출 */
function extractHolder(text: string): string {
  // 법인/기관명 (개인보다 먼저 체크 — 법인명이 더 긴 패턴)
  const corpPatterns = [
    /((?:주식회사|㈜)\s*[가-힣A-Za-z0-9\s]{1,30})/,
    /([가-힣]+(?:은행|보험|저축은행|캐피탈|신용협동조합|신탁|증권|자산관리|공사|조합|재단|학교법인|종교법인|사단법인|재단법인|유한회사|합자회사|합명회사)[가-힣\s]*)/,
    /((?:사\)|사\(|법인)[가-힣\s]{2,20})/,
  ];
  for (const pattern of corpPatterns) {
    const m = text.match(pattern);
    if (m) return m[1].trim();
  }

  // 한글 이름 패턴 (2~5글자 — 복성/긴 이름 지원)
  const m = text.match(/([가-힣]{2,5})\s*(?:\d{6}|[（(]|$)/);
  if (m) return m[1];

  return "";
}

// ─── 섹션 분리 ───

interface RawSections {
  titleRaw: string;
  gapguRaw: string;
  eulguRaw: string;
}

function splitSections(text: string): RawSections {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ");

  // 섹션 헤더 패턴 (다양한 포맷 대응)
  const titlePattern = /【\s*표\s*제\s*부\s*】/;
  const gapguPattern = /【\s*갑\s*구\s*】/;
  const eulguPattern = /【\s*을\s*구\s*】/;

  // 대체 패턴 (괄호 형식)
  const titlePatternAlt = /\[\s*표\s*제\s*부\s*\]/;
  const gapguPatternAlt = /\[\s*갑\s*구\s*\]/;
  const eulguPatternAlt = /\[\s*을\s*구\s*\]/;

  // 일반 텍스트 패턴
  const titlePatternText = /표\s*제\s*부/;
  const gapguPatternText = /갑\s*구/;
  const eulguPatternText = /을\s*구/;

  function findIndex(patterns: RegExp[]): number {
    for (const p of patterns) {
      const m = normalized.search(p);
      if (m !== -1) return m;
    }
    return -1;
  }

  const titleIdx = findIndex([titlePattern, titlePatternAlt, titlePatternText]);
  const gapguIdx = findIndex([gapguPattern, gapguPatternAlt, gapguPatternText]);
  const eulguIdx = findIndex([eulguPattern, eulguPatternAlt, eulguPatternText]);

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

// ─── 표제부 파싱 ───

function parseTitle(raw: string): TitleSection {
  const result: TitleSection = {
    address: "",
    buildingDetail: "",
    area: "",
    structure: "",
    purpose: "",
    landRightRatio: "",
  };

  if (!raw) return result;

  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // 소재지
    if (/소재지|소재지번/.test(line) || /[가-힣]+[시도]\s*[가-힣]+[시군구]/.test(line)) {
      const addrMatch = line.match(/([가-힣]+(?:시|도)\s+[가-힣]+(?:시|군|구)[\s가-힣\d\-호동층]*)/);
      if (addrMatch) result.address = addrMatch[1].trim();
    }

    // 면적
    const area = extractArea(line);
    if (area && !result.area) result.area = area;

    // 구조
    if (/철근콘크리트|철골|벽돌|목조|경량철골|조적/.test(line)) {
      const structMatch = line.match(/((?:철근콘크리트|철골철근콘크리트|철골|벽돌|목조|경량철골|조적)[가-힣\s]*조)/);
      if (structMatch) result.structure = structMatch[1];
    }

    // 용도
    if (/아파트|다세대|다가구|단독주택|오피스텔|근린생활|업무시설|주거용/.test(line)) {
      const purposeMatch = line.match(/(아파트|다세대주택|다가구주택|단독주택|오피스텔|제[12]종근린생활시설|업무시설|공동주택)/);
      if (purposeMatch) result.purpose = purposeMatch[1];
    }

    // 대지권 비율
    if (/대지권\s*비율|대지권비율/.test(line)) {
      const ratioMatch = line.match(/([\d.]+분의\s*[\d.]+|[\d.]+\/[\d.]+)/);
      if (ratioMatch) result.landRightRatio = ratioMatch[1];
    }

    // 건물 내역 (면적 + 구조 + 용도가 함께 있는 줄)
    if (/㎡/.test(line) && !result.buildingDetail) {
      result.buildingDetail = line.replace(/^[\d\s|]+/, "").trim();
    }
  }

  return result;
}

// ─── 갑구 파싱 ───

function parseGapgu(raw: string): GapguEntry[] {
  if (!raw) return [];

  const entries: GapguEntry[] = [];
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  // 헤더 라인 스킵
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/순위번호|등기목적|접수/.test(lines[i])) {
      startIdx = i + 1;
      break;
    }
  }

  let currentEntry: Partial<GapguEntry> | null = null;
  let orderCounter = 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    // 새 항목 시작 감지: 순위번호(숫자)로 시작하거나, 등기 키워드가 있는 줄
    const orderMatch = line.match(/^(\d+)\s/);
    const hasRightKeyword = Object.keys(GAPGU_RISK_MAP).some((k) => line.includes(k));
    const hasDate = extractDate(line) !== "";

    if (orderMatch || (hasRightKeyword && hasDate)) {
      // 이전 엔트리 저장
      if (currentEntry && currentEntry.purpose) {
        entries.push(currentEntry as GapguEntry);
      }

      orderCounter++;
      const date = extractDate(line);
      const { type, risk } = classifyRightType(line, GAPGU_RISK_MAP);
      const cancelled = isCancelled(line);
      const holder = extractHolder(line);

      currentEntry = {
        order: orderMatch ? parseInt(orderMatch[1], 10) : orderCounter,
        date,
        purpose: type,
        detail: line,
        holder,
        isCancelled: cancelled,
        riskType: cancelled ? "info" : risk,
      };
    } else if (currentEntry) {
      // 현재 엔트리에 추가 정보 누적
      currentEntry.detail += " " + line;

      // 추가 줄에서 정보 보완
      if (!currentEntry.date) {
        const d = extractDate(line);
        if (d) currentEntry.date = d;
      }
      if (!currentEntry.holder) {
        const h = extractHolder(line);
        if (h) currentEntry.holder = h;
      }
      if (currentEntry.purpose === "기타") {
        const { type, risk } = classifyRightType(line, GAPGU_RISK_MAP);
        if (type !== "기타") {
          currentEntry.purpose = type;
          currentEntry.riskType = currentEntry.isCancelled ? "info" : risk;
        }
      }
      if (isCancelled(line)) {
        currentEntry.isCancelled = true;
        currentEntry.riskType = "info";
      }
    }
  }

  // 마지막 엔트리 저장
  if (currentEntry && currentEntry.purpose) {
    entries.push(currentEntry as GapguEntry);
  }

  return entries;
}

// ─── 을구 파싱 ───

function parseEulgu(raw: string): EulguEntry[] {
  if (!raw) return [];

  const entries: EulguEntry[] = [];
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/순위번호|등기목적|접수/.test(lines[i])) {
      startIdx = i + 1;
      break;
    }
  }

  let currentEntry: Partial<EulguEntry> | null = null;
  let orderCounter = 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    const orderMatch = line.match(/^(\d+)\s/);
    const hasRightKeyword = Object.keys(EULGU_RISK_MAP).some((k) => line.includes(k));
    const hasDate = extractDate(line) !== "";

    if (orderMatch || (hasRightKeyword && hasDate)) {
      if (currentEntry && currentEntry.purpose) {
        entries.push(currentEntry as EulguEntry);
      }

      orderCounter++;
      const date = extractDate(line);
      const { type, risk } = classifyRightType(line, EULGU_RISK_MAP);
      const cancelled = isCancelled(line);
      const amount = extractAmount(line);
      const holder = extractHolder(line);

      currentEntry = {
        order: orderMatch ? parseInt(orderMatch[1], 10) : orderCounter,
        date,
        purpose: type,
        detail: line,
        amount,
        holder,
        isCancelled: cancelled,
        riskType: cancelled ? "info" : risk,
      };
    } else if (currentEntry) {
      currentEntry.detail += " " + line;

      // 금액이 다음 줄에 있는 경우
      if (!currentEntry.amount || currentEntry.amount === 0) {
        const amt = extractAmount(line);
        if (amt > 0) currentEntry.amount = amt;
      }
      if (!currentEntry.date) {
        const d = extractDate(line);
        if (d) currentEntry.date = d;
      }
      if (!currentEntry.holder) {
        const h = extractHolder(line);
        if (h) currentEntry.holder = h;
      }
      if (currentEntry.purpose === "기타") {
        const { type, risk } = classifyRightType(line, EULGU_RISK_MAP);
        if (type !== "기타") {
          currentEntry.purpose = type;
          currentEntry.riskType = currentEntry.isCancelled ? "info" : risk;
        }
      }
      if (isCancelled(line)) {
        currentEntry.isCancelled = true;
        currentEntry.riskType = "info";
      }
    }
  }

  if (currentEntry && currentEntry.purpose) {
    entries.push(currentEntry as EulguEntry);
  }

  return entries;
}

// ─── 요약 생성 ───

function buildSummary(gapgu: GapguEntry[], eulgu: EulguEntry[]): ParseSummary {
  const activeGapgu = gapgu.filter((e) => !e.isCancelled);
  const activeEulgu = eulgu.filter((e) => !e.isCancelled);

  const totalMortgageAmount = activeEulgu
    .filter((e) => /근저당|저당/.test(e.purpose))
    .reduce((sum, e) => sum + e.amount, 0);

  const totalJeonseAmount = activeEulgu
    .filter((e) => /전세권/.test(e.purpose))
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    totalGapguEntries: gapgu.length,
    totalEulguEntries: eulgu.length,
    activeGapguEntries: activeGapgu.length,
    activeEulguEntries: activeEulgu.length,
    cancelledEntries: gapgu.filter((e) => e.isCancelled).length + eulgu.filter((e) => e.isCancelled).length,
    totalMortgageAmount,
    totalJeonseAmount,
    hasSeizure: activeGapgu.some((e) => e.purpose === "압류"),
    hasProvisionalSeizure: activeGapgu.some((e) => e.purpose === "가압류"),
    hasProvisionalDisposition: activeGapgu.some((e) => e.purpose === "가처분"),
    hasAuctionOrder: activeGapgu.some((e) => /경매개시결정/.test(e.purpose)),
    hasTrust: activeGapgu.some((e) => /신탁/.test(e.purpose)),
    hasProvisionalRegistration: [...activeGapgu, ...activeEulgu].some((e) => e.purpose === "가등기"),
    hasLeaseRegistration: activeEulgu.some((e) => /임차권등기|임차권설정/.test(e.purpose)),
    hasWarningRegistration: activeGapgu.some((e) => e.purpose === "예고등기"),
    hasRedemptionRegistration: activeGapgu.some((e) => /환매/.test(e.purpose)),
    ownershipTransferCount: gapgu.filter((e) => e.purpose === "소유권이전" && !e.isCancelled).length,
    totalClaimsAmount: totalMortgageAmount + totalJeonseAmount,
  };
}

// ─── 메인 파싱 함수 ───

export function parseRegistry(rawText: string): ParsedRegistry {
  const { titleRaw, gapguRaw, eulguRaw } = splitSections(rawText);

  const title = parseTitle(titleRaw);
  const gapgu = parseGapgu(gapguRaw);
  const eulgu = parseEulgu(eulguRaw);
  const summary = buildSummary(gapgu, eulgu);

  return { title, gapgu, eulgu, summary, rawText };
}

// ─── 샘플 데이터 (테스트/데모용) ───

export const SAMPLE_REGISTRY_TEXT = `
──────────────────────────────────────────────────────
                    등 기 부 등 본 (건물)
                    고유번호: 1101-2024-012345
──────────────────────────────────────────────────────

【 표 제 부 】 (건물의 표시)

 표시번호 |  접  수  |     소재지번 및 건물번호     |        건물내역        | 등기원인 및 기타사항
─────────────────────────────────────────────────────────────────────────────
    1     2019년3월15일  서울특별시 강남구 역삼동      철근콘크리트조           [대지권의 목적인 토지의 표시]
                        123-45 래미안레벤투스         지붕슬래브방수           서울특별시 강남구 역삼동
                        제101동 제15층 제1502호       아파트                   123-45
                                                     84.97㎡                  대지권비율 52718.4분의 84.97

【 갑 구 】 (소유권에 관한 사항)

 순위번호 |  등기목적  |     접  수     |      등기원인       |       권리자 및 기타사항
─────────────────────────────────────────────────────────────────────────────
    1     소유권보존   2019년3월20일    2019년3월15일        소유자 대한건설주식회사
                      제12345호        보존등기              110111-0012345

    2     소유권이전   2019년8월10일    2019년8월5일         소유자 김영수
                      제23456호        매매                  850101-1234567
                                                            서울특별시 강남구 역삼로 123

    3     소유권이전   2022년5월20일    2022년5월15일        소유자 박지민
                      제34567호        매매                  900215-2345678
                                                            서울특별시 서초구 서초대로 456

    4     가압류      2024년8월15일    2024년8월14일         채권자 이상호
                      제45678호        서울중앙지방법원       청구금액 금 150,000,000원
                                      2024카단12345

    5     소유권이전   2025년1월10일    2025년1월8일         소유자 최현우
                      제56789호        매매                  880320-1456789
                                                            서울특별시 강남구 테헤란로 789
          가압류말소   2025년1월10일    해제
                      제56790호

【 을 구 】 (소유권 이외의 권리에 관한 사항)

 순위번호 |  등기목적  |     접  수     |      등기원인       |       권리자 및 기타사항
─────────────────────────────────────────────────────────────────────────────
    1     근저당권설정  2019년8월12일   2019년8월10일         채권최고액 금 480,000,000원
                      제23460호        설정계약              근저당권자 국민은행
                                                            채무자 김영수

    2     근저당권설정  2022년5월25일   2022년5월20일         채권최고액 금 360,000,000원
                      제34570호        설정계약              근저당권자 신한은행
                                                            채무자 박지민
          1번근저당권말소 2022년5월25일  해제
                      제34571호

    3     전세권설정   2023년3월10일    2023년3월8일          전세금 금 550,000,000원
                      제40001호        설정계약              전세권자 정민수
                                                            범위: 건물전부
                                                            존속기간: 2023년3월10일부터 2025년3월9일까지

    4     근저당권설정  2025년1월15일   2025년1월10일         채권최고액 금 540,000,000원
                      제56800호        설정계약              근저당권자 하나은행
                                                            채무자 최현우
          2번근저당권말소 2025년1월15일  해제
                      제56801호
`.trim();
