/**
 * VESTRA 국토교통부 실거래가 API 클라이언트
 * ─────────────────────────────────────────
 * 공공데이터포털(data.go.kr)의 국토교통부 아파트 실거래가 API를 호출.
 * XML 응답을 파싱하여 구조화된 거래 데이터로 변환.
 */

// ─── 타입 정의 ───

export interface RealTransaction {
  dealAmount: number;    // 거래금액 (원 단위)
  buildYear: number;     // 건축년도
  dealYear: number;      // 거래년도
  dealMonth: number;     // 거래월
  dealDay: number;       // 거래일
  aptName: string;       // 아파트명
  area: number;          // 전용면적 (㎡)
  floor: number;         // 층
  dong: string;          // 법정동
}

export interface PriceResult {
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  transactionCount: number;
  transactions: RealTransaction[];
  period: string;
}

// ─── 법정동 코드 매핑 (주요 지역) ───

const LAWD_CODE_MAP: Record<string, string> = {
  "강남구": "11680",
  "서초구": "11650",
  "송파구": "11710",
  "강동구": "11740",
  "마포구": "11440",
  "용산구": "11170",
  "성동구": "11200",
  "광진구": "11215",
  "동작구": "11590",
  "영등포구": "11560",
  "양천구": "11470",
  "강서구": "11500",
  "구로구": "11530",
  "금천구": "11545",
  "관악구": "11620",
  "노원구": "11350",
  "도봉구": "11320",
  "강북구": "11305",
  "성북구": "11290",
  "중랑구": "11260",
  "동대문구": "11230",
  "종로구": "11110",
  "중구": "11140",
  "은평구": "11380",
  "서대문구": "11410",
};

/** 주소에서 법정동 코드 추출 */
export function extractLawdCode(address: string): string | null {
  for (const [gu, code] of Object.entries(LAWD_CODE_MAP)) {
    if (address.includes(gu)) return code;
  }
  return null;
}

/** XML에서 특정 태그 값 추출 */
function extractXmlValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>\\s*([^<]*)\\s*</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

/** XML 응답에서 거래 목록 파싱 */
function parseTransactions(xml: string): RealTransaction[] {
  const items: RealTransaction[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const dealAmountRaw = extractXmlValue(item, "거래금액").replace(/,/g, "");
    const dealAmount = parseInt(dealAmountRaw, 10) * 10000; // 만원 → 원

    if (isNaN(dealAmount) || dealAmount <= 0) continue;

    items.push({
      dealAmount,
      buildYear: parseInt(extractXmlValue(item, "건축년도"), 10) || 0,
      dealYear: parseInt(extractXmlValue(item, "년"), 10) || 0,
      dealMonth: parseInt(extractXmlValue(item, "월"), 10) || 0,
      dealDay: parseInt(extractXmlValue(item, "일"), 10) || 0,
      aptName: extractXmlValue(item, "아파트") || extractXmlValue(item, "단지명"),
      area: parseFloat(extractXmlValue(item, "전용면적")) || 0,
      floor: parseInt(extractXmlValue(item, "층"), 10) || 0,
      dong: extractXmlValue(item, "법정동"),
    });
  }

  return items;
}

/**
 * 국토교통부 실거래가 API 호출
 *
 * @param lawdCd - 법정동 코드 (5자리)
 * @param dealYmd - 계약년월 (YYYYMM)
 * @returns 거래 목록
 */
export async function fetchRealTransactions(
  lawdCd: string,
  dealYmd: string
): Promise<RealTransaction[]> {
  const serviceKey = process.env.MOLIT_API_KEY;

  if (!serviceKey) {
    console.warn("MOLIT_API_KEY 환경변수가 설정되지 않았습니다.");
    return [];
  }

  const baseUrl =
    "http://openapi.molit.go.kr/OpenAPI_ToolInstall498/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTradeDev";

  const params = new URLSearchParams({
    serviceKey,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    pageNo: "1",
    numOfRows: "100",
  });

  try {
    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: { Accept: "application/xml" },
    });

    if (!res.ok) {
      console.error(`MOLIT API error: ${res.status}`);
      return [];
    }

    const xml = await res.text();
    return parseTransactions(xml);
  } catch (error) {
    console.error("MOLIT API fetch error:", error);
    return [];
  }
}

/**
 * 특정 주소의 최근 실거래가 조회
 *
 * @param address - 부동산 주소
 * @param months - 조회 기간 (기본 6개월)
 * @returns 평균 시세 및 거래 목록
 */
export async function fetchRecentPrices(
  address: string,
  months: number = 6
): Promise<PriceResult | null> {
  const lawdCd = extractLawdCode(address);
  if (!lawdCd) return null;

  const allTransactions: RealTransaction[] = [];
  const now = new Date();

  // 최근 N개월 조회
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dealYmd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    const txns = await fetchRealTransactions(lawdCd, dealYmd);
    allTransactions.push(...txns);
  }

  if (allTransactions.length === 0) {
    return {
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      transactionCount: 0,
      transactions: [],
      period: `최근 ${months}개월`,
    };
  }

  const prices = allTransactions.map((t) => t.dealAmount);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    avgPrice,
    minPrice,
    maxPrice,
    transactionCount: allTransactions.length,
    transactions: allTransactions.sort(
      (a, b) =>
        b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay -
        (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)
    ),
    period: `최근 ${months}개월`,
  };
}
