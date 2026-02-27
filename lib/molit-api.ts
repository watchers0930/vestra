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

export interface RentTransaction {
  deposit: number;       // 보증금 (원 단위)
  monthlyRent: number;   // 월세 (원 단위, 전세면 0)
  rentType: string;      // 전세/월세
  buildYear: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  aptName: string;
  area: number;
  floor: number;
  dong: string;
}

export interface RentPriceResult {
  avgDeposit: number;
  minDeposit: number;
  maxDeposit: number;
  jeonseCount: number;   // 전세 건수
  wolseCount: number;    // 월세 건수
  transactions: RentTransaction[];
  period: string;
}

export interface ComprehensivePriceResult {
  sale: PriceResult | null;
  rent: RentPriceResult | null;
  jeonseRatio: number | null;  // 실데이터 기반 전세가율 (%)
}

// ─── 법정동 코드 매핑 (전국) ───
// 키 규칙:
//   - 고유한 구/시/군 이름은 그대로 사용 (예: "강남구", "해운대구")
//   - 여러 광역시에 동일 이름이 존재하는 구는 도시명 접두 (예: "부산중구", "대구동구")
//   - 도시 약식 키도 함께 등록 (예: "수원시" → 영통구, "부산" → 해운대구)

const LAWD_CODE_MAP: Record<string, string> = {
  // ── 서울특별시 (11) ──
  "강남구": "11680", "서초구": "11650", "송파구": "11710", "강동구": "11740",
  "마포구": "11440", "용산구": "11170", "성동구": "11200", "광진구": "11215",
  "동작구": "11590", "영등포구": "11560", "양천구": "11470", "강서구": "11500",
  "구로구": "11530", "금천구": "11545", "관악구": "11620", "노원구": "11350",
  "도봉구": "11320", "강북구": "11305", "성북구": "11290", "중랑구": "11260",
  "동대문구": "11230", "종로구": "11110", "은평구": "11380", "서대문구": "11410",

  // ── 부산광역시 (26) ──
  "영도구": "26200", "부산진구": "26230", "동래구": "26260",
  "해운대구": "26350", "사하구": "26380", "금정구": "26410",
  "연제구": "26470", "수영구": "26500", "사상구": "26530", "기장군": "26710",
  // 부산 내 다른 도시와 겹치는 구
  "부산중구": "26110", "부산서구": "26140", "부산동구": "26170",
  "부산남구": "26290", "부산북구": "26320", "부산강서구": "26440",

  // ── 대구광역시 (27) ──
  "수성구": "27260", "달서구": "27290", "달성군": "27710", "군위군": "27720",
  "대구중구": "27110", "대구동구": "27140", "대구서구": "27170",
  "대구남구": "27200", "대구북구": "27230",

  // ── 인천광역시 (28) ──
  "미추홀구": "28177", "연수구": "28185", "남동구": "28200",
  "부평구": "28237", "계양구": "28245", "강화군": "28710", "옹진군": "28720",
  "인천중구": "28110", "인천동구": "28120", "인천서구": "28260",

  // ── 광주광역시 (29) ──
  "광산구": "29200",
  "광주동구": "29110", "광주서구": "29140", "광주남구": "29155", "광주북구": "29170",

  // ── 대전광역시 (30) ──
  "유성구": "30200", "대덕구": "30230",
  "대전동구": "30110", "대전중구": "30140", "대전서구": "30170",

  // ── 울산광역시 (31) ──
  "울주군": "31710",
  "울산중구": "31110", "울산남구": "31140", "울산동구": "31170", "울산북구": "31200",

  // ── 세종특별자치시 (36) ──
  "세종시": "36110", "세종": "36110",

  // ── 경기도 (41) ──
  "수원시장안구": "41111", "수원시권선구": "41113", "수원시팔달구": "41115", "수원시영통구": "41117",
  "성남시수정구": "41131", "성남시중원구": "41133", "성남시분당구": "41135",
  "의정부시": "41150",
  "안양시만안구": "41171", "안양시동안구": "41173",
  "부천시": "41190", "광명시": "41210", "평택시": "41220", "동두천시": "41250",
  "안산시상록구": "41271", "안산시단원구": "41273",
  "고양시덕양구": "41281", "고양시일산동구": "41285", "고양시일산서구": "41287",
  "과천시": "41290", "구리시": "41310", "남양주시": "41360", "오산시": "41370",
  "시흥시": "41390", "군포시": "41410", "의왕시": "41430", "하남시": "41450",
  "용인시처인구": "41461", "용인시기흥구": "41463", "용인시수지구": "41465",
  "파주시": "41480", "이천시": "41500", "안성시": "41550", "김포시": "41570",
  "화성시": "41590", "양주시": "41630", "포천시": "41650",
  "여주시": "41670", "양평군": "41730", "가평군": "41820", "연천군": "41800",
  // 경기도 약식
  "수원시": "41117", "수원": "41117", "성남시": "41135", "분당": "41135",
  "안양시": "41173", "안산시": "41271", "고양시": "41285", "일산": "41285",
  "용인시": "41463", "광주시": "41610",

  // ── 강원특별자치도 (42) ──
  "춘천시": "42110", "원주시": "42130", "강릉시": "42150", "동해시": "42170",
  "태백시": "42190", "속초시": "42210", "삼척시": "42230",
  "홍천군": "42310", "횡성군": "42330", "영월군": "42350", "평창군": "42370",
  "정선군": "42390", "철원군": "42410", "화천군": "42430", "양구군": "42450",
  "인제군": "42470", "고성군": "42480", "양양군": "42490",

  // ── 충청북도 (43) ──
  "청주시상당구": "43111", "청주시서원구": "43112", "청주시흥덕구": "43113", "청주시청원구": "43114",
  "충주시": "43130", "제천시": "43150",
  "보은군": "43720", "옥천군": "43730", "영동군": "43740", "증평군": "43745",
  "진천군": "43750", "괴산군": "43760", "음성군": "43770", "단양군": "43800",
  "청주시": "43111", "청주": "43111",

  // ── 충청남도 (44) ──
  "천안시동남구": "44131", "천안시서북구": "44133",
  "공주시": "44150", "보령시": "44180", "아산시": "44200", "서산시": "44210",
  "논산시": "44230", "계룡시": "44250", "당진시": "44270",
  "금산군": "44710", "부여군": "44760", "서천군": "44770", "청양군": "44790",
  "홍성군": "44800", "예산군": "44810", "태안군": "44825",
  "천안시": "44131", "천안": "44131",

  // ── 전북특별자치도 (45) ──
  "전주시완산구": "45111", "전주시덕진구": "45113",
  "군산시": "45130", "익산시": "45140", "정읍시": "45180", "남원시": "45190", "김제시": "45210",
  "완주군": "45710", "진안군": "45720", "무주군": "45730", "장수군": "45740",
  "임실군": "45750", "순창군": "45770", "고창군": "45790", "부안군": "45800",
  "전주시": "45111", "전주": "45111",

  // ── 전라남도 (46) ──
  "목포시": "46110", "여수시": "46130", "순천시": "46150", "나주시": "46170", "광양시": "46230",
  "담양군": "46710", "곡성군": "46720", "구례군": "46730", "고흥군": "46770",
  "보성군": "46780", "화순군": "46790", "장흥군": "46800", "강진군": "46810",
  "해남군": "46820", "영암군": "46830", "무안군": "46840", "함평군": "46860",
  "영광군": "46870", "장성군": "46880", "완도군": "46890", "진도군": "46900", "신안군": "46910",

  // ── 경상북도 (47) ──
  "포항시남구": "47111", "포항시북구": "47113",
  "경주시": "47130", "김천시": "47150", "안동시": "47170", "구미시": "47190",
  "영주시": "47210", "영천시": "47230", "상주시": "47250", "문경시": "47280", "경산시": "47290",
  "의성군": "47730", "청송군": "47750", "영양군": "47760", "영덕군": "47770",
  "청도군": "47820", "고령군": "47830", "성주군": "47840", "칠곡군": "47850",
  "예천군": "47900", "봉화군": "47920", "울진군": "47930", "울릉군": "47940",
  "포항시": "47111", "포항": "47111",

  // ── 경상남도 (48) ──
  "창원시의창구": "48121", "창원시성산구": "48123",
  "창원시마산합포구": "48125", "창원시마산회원구": "48127", "창원시진해구": "48129",
  "진주시": "48170", "통영시": "48220", "사천시": "48240", "김해시": "48250",
  "밀양시": "48270", "거제시": "48310", "양산시": "48330",
  "의령군": "48720", "함안군": "48730", "창녕군": "48740",
  "남해군": "48840", "하동군": "48850", "산청군": "48860",
  "함양군": "48870", "거창군": "48880", "합천군": "48890",
  "창원시": "48121", "창원": "48121", "마산": "48125",
  // 경남 고성군 (강원 고성군과 구별)
  "경상남도고성": "48820", "경남고성": "48820",

  // ── 제주특별자치도 (50) ──
  "제주시": "50110", "서귀포시": "50130", "제주": "50110",

  // ── 광역시 약식 (구 미지정 시 대표 구) ──
  "부산": "26350", "대구": "27260", "인천": "28260",
  "광주": "29200", "대전": "30200", "울산": "31140",

  // ── 서울 중구 (기본값, 다른 도시 중구는 접두어로 구분) ──
  "중구": "11140",
};

/**
 * 주소에서 법정동 코드 추출
 *
 * 매칭 전략:
 * 1. 주소에서 "특별시", "광역시" 등 행정 접미사와 공백을 제거하여 정규화
 * 2. 키를 길이 내림차순 정렬하여 가장 구체적인 매칭을 우선 적용
 *    (예: "부산중구"(4자) > "중구"(2자), "수원시영통구"(6자) > "수원시"(3자))
 */
export function extractLawdCode(address: string): string | null {
  // 행정 접미사 제거 후 공백 제거 → "부산광역시 중구" → "부산중구"
  const normalized = address
    .replace(/특별자치시|특별자치도|특별시|광역시/g, "")
    .replace(/\s+/g, "");

  // 긴 키(구체적)부터 매칭하여 오매칭 방지
  const entries = Object.entries(LAWD_CODE_MAP)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [key, code] of entries) {
    if (normalized.includes(key)) return code;
  }

  return null;
}

/** XML에서 특정 태그 값 추출 */
function extractXmlValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>\\s*([^<]*)\\s*</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

/** 영문/한글 태그 모두 시도 */
function extractVal(xml: string, eng: string, kor: string): string {
  return extractXmlValue(xml, eng) || extractXmlValue(xml, kor);
}

/** MOLIT API 공통 fetch (타임아웃 + User-Agent 포함) */
async function molitFetch(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: { Accept: "application/xml", "User-Agent": "VESTRA/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** XML 응답에서 거래 목록 파싱 (영문/한글 태그 호환) */
function parseTransactions(xml: string): RealTransaction[] {
  const items: RealTransaction[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const dealAmountRaw = extractVal(item, "dealAmount", "거래금액").replace(/,/g, "");
    const dealAmount = parseInt(dealAmountRaw, 10) * 10000;

    if (isNaN(dealAmount) || dealAmount <= 0) continue;

    items.push({
      dealAmount,
      buildYear: parseInt(extractVal(item, "buildYear", "건축년도"), 10) || 0,
      dealYear: parseInt(extractVal(item, "dealYear", "년"), 10) || 0,
      dealMonth: parseInt(extractVal(item, "dealMonth", "월"), 10) || 0,
      dealDay: parseInt(extractVal(item, "dealDay", "일"), 10) || 0,
      aptName: extractVal(item, "aptNm", "아파트") || extractVal(item, "aptNm", "단지명"),
      area: parseFloat(extractVal(item, "excluUseAr", "전용면적")) || 0,
      floor: parseInt(extractVal(item, "floor", "층"), 10) || 0,
      dong: extractVal(item, "umdNm", "법정동"),
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
    "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

  const params = new URLSearchParams({
    serviceKey,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    pageNo: "1",
    numOfRows: "1000",
  });

  const xml = await molitFetch(`${baseUrl}?${params.toString()}`);
  if (!xml) return [];
  return parseTransactions(xml);
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
  months: number = 12
): Promise<PriceResult | null> {
  const lawdCd = extractLawdCode(address);
  if (!lawdCd) return null;

  const now = new Date();

  // 최근 N개월 병렬 조회
  const promises = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dealYmd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    return fetchRealTransactions(lawdCd, dealYmd);
  });
  const results = await Promise.all(promises);
  const allTransactions = results.flat();

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

// ─── 전월세 실거래 ───

/** 전월세 XML 파싱 (영문/한글 태그 호환) */
function parseRentTransactions(xml: string): RentTransaction[] {
  const items: RentTransaction[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const depositRaw = extractVal(item, "deposit", "보증금액").replace(/,/g, "").trim();
    const deposit = parseInt(depositRaw, 10) * 10000;

    if (isNaN(deposit) || deposit <= 0) continue;

    const monthlyRentRaw = extractVal(item, "monthlyRent", "월세금액").replace(/,/g, "").trim();
    const monthlyRent = (parseInt(monthlyRentRaw, 10) || 0) * 10000;

    items.push({
      deposit,
      monthlyRent,
      rentType: monthlyRent === 0 ? "전세" : "월세",
      buildYear: parseInt(extractVal(item, "buildYear", "건축년도"), 10) || 0,
      dealYear: parseInt(extractVal(item, "dealYear", "년"), 10) || 0,
      dealMonth: parseInt(extractVal(item, "dealMonth", "월"), 10) || 0,
      dealDay: parseInt(extractVal(item, "dealDay", "일"), 10) || 0,
      aptName: extractVal(item, "aptNm", "아파트") || extractVal(item, "aptNm", "단지명"),
      area: parseFloat(extractVal(item, "excluUseAr", "전용면적")) || 0,
      floor: parseInt(extractVal(item, "floor", "층"), 10) || 0,
      dong: extractVal(item, "umdNm", "법정동"),
    });
  }

  return items;
}

/** 아파트 전월세 실거래 API 호출 */
export async function fetchAptRentTransactions(
  lawdCd: string,
  dealYmd: string
): Promise<RentTransaction[]> {
  const serviceKey = process.env.MOLIT_API_KEY;
  if (!serviceKey) return [];

  const baseUrl =
    "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";

  const params = new URLSearchParams({
    serviceKey,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    pageNo: "1",
    numOfRows: "1000",
  });

  const xml = await molitFetch(`${baseUrl}?${params.toString()}`);
  if (!xml) return [];
  return parseRentTransactions(xml);
}

/** 최근 전월세 실거래 조회 */
export async function fetchRecentRentPrices(
  address: string,
  months: number = 12
): Promise<RentPriceResult | null> {
  const lawdCd = extractLawdCode(address);
  if (!lawdCd) return null;

  const now = new Date();
  const promises = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dealYmd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    return fetchAptRentTransactions(lawdCd, dealYmd);
  });
  const results = await Promise.all(promises);
  const allTransactions = results.flat();

  // 전세만 필터링
  const jeonseOnly = allTransactions.filter((t) => t.rentType === "전세");
  const wolseOnly = allTransactions.filter((t) => t.rentType === "월세");

  if (jeonseOnly.length === 0 && wolseOnly.length === 0) {
    return {
      avgDeposit: 0, minDeposit: 0, maxDeposit: 0,
      jeonseCount: 0, wolseCount: 0,
      transactions: [], period: `최근 ${months}개월`,
    };
  }

  const deposits = jeonseOnly.map((t) => t.deposit);
  const avgDeposit = deposits.length > 0
    ? Math.round(deposits.reduce((a, b) => a + b, 0) / deposits.length)
    : 0;

  return {
    avgDeposit,
    minDeposit: deposits.length > 0 ? Math.min(...deposits) : 0,
    maxDeposit: deposits.length > 0 ? Math.max(...deposits) : 0,
    jeonseCount: jeonseOnly.length,
    wolseCount: wolseOnly.length,
    transactions: allTransactions.sort(
      (a, b) =>
        b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay -
        (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)
    ),
    period: `최근 ${months}개월`,
  };
}

// ─── 연립다세대/단독다가구/오피스텔 매매 ───

/** 범용 매매 실거래 API 호출 (엔드포인트 지정, 영문/한글 태그 호환) */
async function fetchGenericSaleTransactions(
  endpoint: string,
  nameTag: string,
  lawdCd: string,
  dealYmd: string
): Promise<RealTransaction[]> {
  const serviceKey = process.env.MOLIT_API_KEY;
  if (!serviceKey) return [];

  const params = new URLSearchParams({
    serviceKey,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    pageNo: "1",
    numOfRows: "1000",
  });

  const xml = await molitFetch(`${endpoint}?${params.toString()}`);
  if (!xml) return [];

  const items: RealTransaction[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const amtRaw = extractVal(item, "dealAmount", "거래금액").replace(/,/g, "");
    const amt = parseInt(amtRaw, 10) * 10000;
    if (isNaN(amt) || amt <= 0) continue;
    items.push({
      dealAmount: amt,
      buildYear: parseInt(extractVal(item, "buildYear", "건축년도"), 10) || 0,
      dealYear: parseInt(extractVal(item, "dealYear", "년"), 10) || 0,
      dealMonth: parseInt(extractVal(item, "dealMonth", "월"), 10) || 0,
      dealDay: parseInt(extractVal(item, "dealDay", "일"), 10) || 0,
      aptName: extractXmlValue(item, nameTag) || extractVal(item, "aptNm", "아파트") || extractXmlValue(item, "단지명") || "",
      area: parseFloat(extractVal(item, "excluUseAr", "전용면적")) || parseFloat(extractXmlValue(item, "연면적")) || 0,
      floor: parseInt(extractVal(item, "floor", "층"), 10) || 0,
      dong: extractVal(item, "umdNm", "법정동"),
    });
  }
  return items;
}

const MOLIT_ENDPOINTS = {
  aptTrade:
    "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev",
  rowHouseTrade:
    "https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade",
  singleHouseTrade:
    "https://apis.data.go.kr/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade",
  officeTelTrade:
    "https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade",
};

/**
 * 종합 시세 조회 (매매 + 전월세, 아파트 + 연립 + 단독 + 오피스텔)
 *
 * 아파트 매매를 기본으로 하고, 데이터가 부족하면 연립/단독/오피스텔까지 확장 조회.
 * 전월세 데이터로 실데이터 기반 전세가율 산출.
 */
export async function fetchComprehensivePrices(
  address: string,
  months: number = 12
): Promise<ComprehensivePriceResult> {
  const lawdCd = extractLawdCode(address);
  if (!lawdCd) return { sale: null, rent: null, jeonseRatio: null };

  const now = new Date();
  const dealYmds = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // 아파트 매매 + 전월세 병렬 조회
  const [saleResult, rentResult] = await Promise.all([
    fetchRecentPrices(address, months),
    fetchRecentRentPrices(address, months),
  ]);

  // 아파트 매매 데이터가 부족하면 연립/단독/오피스텔 추가 조회
  let sale = saleResult;
  if (!sale || sale.transactionCount < 3) {
    const extraPromises = dealYmds.slice(0, 3).flatMap((ymd) => [
      fetchGenericSaleTransactions(MOLIT_ENDPOINTS.rowHouseTrade, "연립다세대", lawdCd, ymd),
      fetchGenericSaleTransactions(MOLIT_ENDPOINTS.officeTelTrade, "단지명", lawdCd, ymd),
    ]);
    const extraResults = (await Promise.all(extraPromises)).flat();

    if (extraResults.length > 0) {
      const existing = sale?.transactions ?? [];
      const all = [...existing, ...extraResults];
      const prices = all.map((t) => t.dealAmount);
      sale = {
        avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        transactionCount: all.length,
        transactions: all.sort(
          (a, b) =>
            b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay -
            (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)
        ),
        period: `최근 ${months}개월 (종합)`,
      };
    }
  }

  // 실데이터 기반 전세가율 계산
  let jeonseRatio: number | null = null;
  if (sale && sale.avgPrice > 0 && rentResult && rentResult.avgDeposit > 0) {
    jeonseRatio = Math.round((rentResult.avgDeposit / sale.avgPrice) * 1000) / 10;
  }

  return { sale, rent: rentResult, jeonseRatio };
}
