/**
 * VESTRA DART 전자공시 API 클라이언트
 * ─────────────────────────────────────
 * 금융감독원 DART(전자공시시스템)에서 기업 재무정보 조회.
 * 사업성 분석 시 시행사/시공사 재무건전성 평가에 활용.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ DART_API_KEY 발급: https://opendart.fss.or.kr/ → 인증키  │
 * │ (무료). .env.local에 DART_API_KEY=발급받은키 추가          │
 * └──────────────────────────────────────────────────────────┘
 */

import { apiCache, APICache } from "../../api-cache";

// ─── 타입 정의 ───

export interface DARTCorpInfo {
  corpCode: string;       // 고유번호 (8자리)
  corpName: string;       // 회사명
  stockCode: string;      // 종목코드 (상장사만)
  ceoName: string;        // 대표자명
  corpClass: string;      // 법인유형 (Y:유가, K:코스닥, N:코넥스, E:기타)
  indutyCode: string;     // 업종코드
  establishDate: string;  // 설립일
  dataSource: "live" | "fallback";
}

export interface IncomeStatement {
  year: number;
  revenue: number;          // 매출액
  costOfSales: number;      // 매출원가
  grossProfit: number;      // 매출총이익
  operatingProfit: number;  // 영업이익
  ebitda: number;           // EBITDA
  netIncome: number;        // 당기순이익
}

export interface BalanceSheet {
  year: number;
  totalAssets: number;      // 총자산
  totalLiabilities: number; // 총부채
  totalEquity: number;      // 총자본
  totalDebt: number;        // 총차입금 (단기+장기)
  debtRatio: number;        // 부채비율 (%)
}

export interface DARTFinancialResult {
  corpCode: string;
  corpName: string;
  incomeStatements: IncomeStatement[];
  balanceSheets: BalanceSheet[];
  dataSource: "live" | "fallback";
}

// ─── 설정 ───

const API_BASE = "https://opendart.fss.or.kr/api";
const TIMEOUT_MS = 10_000;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12시간

// ─── 공통 fetch 유틸 ───

async function dartFetch(
  endpoint: string,
  params: Record<string, string>
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) return null;

  const searchParams = new URLSearchParams({
    crtfc_key: apiKey,
    ...params,
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${API_BASE}/${endpoint}?${searchParams.toString()}`, {
      signal: controller.signal,
      headers: { "User-Agent": "VESTRA/1.0" },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    // DART API 공통 에러 처리
    if (data.status && data.status !== "000") {
      console.warn(`DART API 오류 [${data.status}]: ${data.message}`);
      return null;
    }
    return data;
  } catch (error) {
    console.warn("DART API 호출 실패:", error);
    return null;
  }
}

// ─── 폴백 데이터 ───

function getFallbackCorpInfo(corpName: string): DARTCorpInfo {
  return {
    corpCode: "00000000",
    corpName,
    stockCode: "",
    ceoName: "-",
    corpClass: "E",
    indutyCode: "F411",   // 건설업
    establishDate: "20100101",
    dataSource: "fallback",
  };
}

function getFallbackIncomeStatements(): IncomeStatement[] {
  // 중견 건설사 기준 폴백 (단위: 백만원)
  return [
    { year: 2018, revenue: 85000, costOfSales: 72250, grossProfit: 12750, operatingProfit: 5100, ebitda: 7650, netIncome: 3400 },
    { year: 2019, revenue: 92000, costOfSales: 77280, grossProfit: 14720, operatingProfit: 5888, ebitda: 8832, netIncome: 3680 },
    { year: 2020, revenue: 88000, costOfSales: 74800, grossProfit: 13200, operatingProfit: 4400, ebitda: 7040, netIncome: 2640 },
    { year: 2021, revenue: 105000, costOfSales: 88200, grossProfit: 16800, operatingProfit: 7350, ebitda: 10500, netIncome: 5250 },
    { year: 2022, revenue: 118000, costOfSales: 97940, grossProfit: 20060, operatingProfit: 8260, ebitda: 12980, netIncome: 5900 },
    { year: 2023, revenue: 125000, costOfSales: 103750, grossProfit: 21250, operatingProfit: 8750, ebitda: 13750, netIncome: 6250 },
    { year: 2024, revenue: 132000, costOfSales: 110880, grossProfit: 21120, operatingProfit: 7920, ebitda: 13200, netIncome: 5280 },
    { year: 2025, revenue: 128000, costOfSales: 108800, grossProfit: 19200, operatingProfit: 6400, ebitda: 11520, netIncome: 3840 },
  ];
}

function getFallbackBalanceSheets(): BalanceSheet[] {
  return [
    { year: 2018, totalAssets: 120000, totalLiabilities: 78000, totalEquity: 42000, totalDebt: 35000, debtRatio: 185.7 },
    { year: 2019, totalAssets: 135000, totalLiabilities: 87750, totalEquity: 47250, totalDebt: 39000, debtRatio: 185.7 },
    { year: 2020, totalAssets: 142000, totalLiabilities: 94740, totalEquity: 47260, totalDebt: 42000, debtRatio: 200.4 },
    { year: 2021, totalAssets: 168000, totalLiabilities: 108360, totalEquity: 59640, totalDebt: 48000, debtRatio: 181.7 },
    { year: 2022, totalAssets: 195000, totalLiabilities: 126750, totalEquity: 68250, totalDebt: 55000, debtRatio: 185.7 },
    { year: 2023, totalAssets: 210000, totalLiabilities: 134400, totalEquity: 75600, totalDebt: 58000, debtRatio: 177.8 },
    { year: 2024, totalAssets: 225000, totalLiabilities: 146250, totalEquity: 78750, totalDebt: 62000, debtRatio: 185.7 },
    { year: 2025, totalAssets: 218000, totalLiabilities: 145030, totalEquity: 72970, totalDebt: 65000, debtRatio: 198.7 },
  ];
}

// ─── API 함수 ───

/**
 * 회사 기본정보 조회
 *
 * @param corpCode - DART 고유번호 (8자리)
 */
export async function fetchCorpInfo(
  corpCode: string
): Promise<DARTCorpInfo> {
  const cacheKey = APICache.makeKey("dart-corp", corpCode);
  const cached = apiCache.get<DARTCorpInfo>(cacheKey);
  if (cached) return cached;

  if (!process.env.DART_API_KEY) {
    console.warn("DART_API_KEY 미설정. 폴백 데이터를 사용합니다.");
    return getFallbackCorpInfo(corpCode);
  }

  const data = await dartFetch("company.json", { corp_code: corpCode });

  if (!data) return getFallbackCorpInfo(corpCode);

  try {
    const result: DARTCorpInfo = {
      corpCode: (data.corp_code as string) || corpCode,
      corpName: (data.corp_name as string) || "-",
      stockCode: (data.stock_code as string) || "",
      ceoName: (data.ceo_nm as string) || "-",
      corpClass: (data.corp_cls as string) || "E",
      indutyCode: (data.induty_code as string) || "",
      establishDate: (data.est_dt as string) || "",
      dataSource: "live",
    };

    apiCache.set(cacheKey, result, CACHE_TTL);
    return result;
  } catch {
    return getFallbackCorpInfo(corpCode);
  }
}

/**
 * 재무제표 조회 (손익계산서 + 재무상태표)
 *
 * 최근 5~8년간의 재무 데이터를 연도별로 조회.
 * reprt_code: 11011(사업보고서), 11012(반기), 11013(1분기), 11014(3분기)
 *
 * @param corpCode - DART 고유번호
 * @param years - 조회 연수 (기본 5, 최대 8)
 */
export async function fetchFinancials(
  corpCode: string,
  years: number = 5
): Promise<DARTFinancialResult> {
  const cacheKey = APICache.makeKey("dart-fin", corpCode, years);
  const cached = apiCache.get<DARTFinancialResult>(cacheKey);
  if (cached) return cached;

  const fallbackResult: DARTFinancialResult = {
    corpCode,
    corpName: "-",
    incomeStatements: getFallbackIncomeStatements().slice(-years),
    balanceSheets: getFallbackBalanceSheets().slice(-years),
    dataSource: "fallback",
  };

  if (!process.env.DART_API_KEY) {
    console.warn("DART_API_KEY 미설정. 재무 폴백 데이터를 사용합니다.");
    return fallbackResult;
  }

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - Math.min(years, 8);

  const incomeStatements: IncomeStatement[] = [];
  const balanceSheets: BalanceSheet[] = [];

  // 연도별 재무제표 조회 (사업보고서 기준)
  for (let year = startYear; year <= currentYear; year++) {
    const bsnsYear = String(year);

    // 손익계산서 (CFS: 연결, OFS: 개별)
    const isData = await dartFetch("fnlttSinglAcntAll.json", {
      corp_code: corpCode,
      bsns_year: bsnsYear,
      reprt_code: "11011",    // 사업보고서
      fs_div: "CFS",          // 연결재무제표 우선
    });

    if (isData && Array.isArray(isData.list)) {
      const items = isData.list as Array<Record<string, string>>;
      const findAmount = (accountNm: string): number => {
        const row = items.find((r) => r.account_nm?.includes(accountNm));
        return parseInt(row?.thstrm_amount?.replace(/,/g, ""), 10) || 0;
      };

      const revenue = findAmount("매출액") || findAmount("영업수익");
      const costOfSales = findAmount("매출원가");
      const operatingProfit = findAmount("영업이익");
      const netIncome = findAmount("당기순이익") || findAmount("당기순손익");

      if (revenue > 0) {
        incomeStatements.push({
          year,
          revenue,
          costOfSales,
          grossProfit: revenue - costOfSales,
          operatingProfit,
          ebitda: operatingProfit + Math.round(operatingProfit * 0.3), // 감가상각비 추정
          netIncome,
        });
      }

      // 재무상태표 항목
      const totalAssets = findAmount("자산총계");
      const totalLiabilities = findAmount("부채총계");
      const totalEquity = findAmount("자본총계");
      const shortDebt = findAmount("단기차입금");
      const longDebt = findAmount("장기차입금");
      const totalDebt = shortDebt + longDebt;

      if (totalAssets > 0) {
        balanceSheets.push({
          year,
          totalAssets,
          totalLiabilities,
          totalEquity,
          totalDebt,
          debtRatio: totalEquity > 0
            ? Math.round((totalLiabilities / totalEquity) * 10) / 10
            : 0,
        });
      }
    }
  }

  const result: DARTFinancialResult = {
    corpCode,
    corpName: "-",
    incomeStatements: incomeStatements.length > 0
      ? incomeStatements.sort((a, b) => a.year - b.year)
      : fallbackResult.incomeStatements,
    balanceSheets: balanceSheets.length > 0
      ? balanceSheets.sort((a, b) => a.year - b.year)
      : fallbackResult.balanceSheets,
    dataSource: incomeStatements.length > 0 ? "live" : "fallback",
  };

  apiCache.set(cacheKey, result, CACHE_TTL);
  return result;
}

/**
 * 회사명으로 corp_code 검색 (기업개황)
 *
 * DART의 기업개황 API는 corp_code가 필요하므로,
 * 회사명으로 먼저 corp_code를 찾는 유틸리티.
 *
 * @param corpName - 회사명 (정확/부분 일치)
 */
export async function searchCorpCode(
  corpName: string
): Promise<{ corpCode: string; corpName: string } | null> {
  const cacheKey = APICache.makeKey("dart-search", corpName);
  const cached = apiCache.get<{ corpCode: string; corpName: string }>(cacheKey);
  if (cached) return cached;

  if (!process.env.DART_API_KEY) return null;

  // 기업개황 검색은 corpCode가 필요하므로, corpCode 파일(XML)을 조회하는 대신
  // 공시검색 API를 활용하여 회사명으로 검색
  const data = await dartFetch("corpCode.xml", {}); // XML이라 별도 처리 필요

  // 실제로는 DART의 고유번호 파일(zip)을 다운로드하여 매핑해야 함
  // 여기서는 간소화: 직접 매핑 테이블 사용
  const KNOWN_CORPS: Record<string, string> = {
    "현대건설": "00126380",
    "대우건설": "00260985",
    "GS건설": "00122002",
    "포스코이앤씨": "00164779",
    "삼성물산": "00126308",
    "DL이앤씨": "00356361",
    "HDC현대산업개발": "00164742",
    "롯데건설": "00159078",
    "SK에코플랜트": "00232860",
    "호반건설": "00826978",
  };

  for (const [name, code] of Object.entries(KNOWN_CORPS)) {
    if (name.includes(corpName) || corpName.includes(name)) {
      const result = { corpCode: code, corpName: name };
      apiCache.set(cacheKey, result, CACHE_TTL);
      return result;
    }
  }

  return null;
}
