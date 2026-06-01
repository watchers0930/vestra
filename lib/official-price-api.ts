/**
 * VESTRA 공시가격 조회 API 클라이언트
 * ─────────────────────────────────────────
 * data.go.kr NSDI 공시가격 API 호출 유틸.
 * - 개별공시지가 (토지)
 * - 공동주택가격 (아파트)
 * - 개별주택가격 (단독주택)
 */

import { apiCache, APICache } from "./api-cache";

// ─── 타입 정의 ───

export interface OfficialPriceResult {
  landPrice: LandPriceItem | null;
  aptPrice: AptPriceItem | null;
  housePrice: HousePriceItem | null;
  pnu: string;
  address: string;
  year: number;
}

export interface LandPriceItem {
  pnu: string;
  price: number;        // 공시지가 (원/㎡)
  area: number;         // 면적 (㎡)
  totalPrice: number;   // 총 공시지가 (원)
  landUse: string;      // 용도지역
  year: number;
}

export interface AptPriceItem {
  pnu: string;
  price: number;        // 공동주택 공시가격 (원)
  area: number;         // 전용면적 (㎡)
  complexName: string;  // 단지명
  dong: string;         // 동
  ho: string;           // 호
  year: number;
}

export interface HousePriceItem {
  pnu: string;
  price: number;        // 개별주택 공시가격 (원)
  area: number;         // 대지면적 (㎡)
  buildingArea: number; // 건물면적 (㎡)
  year: number;
}

// ─── PNU 코드 생성 ───

/**
 * 지번 문자열에서 본번/부번 파싱
 * "123-4" → { main: "0123", sub: "0004" }
 * "123"   → { main: "0123", sub: "0000" }
 */
export function parseJibun(jibun: string): { main: string; sub: string } | null {
  const cleaned = jibun.replace(/[^0-9-]/g, "").trim();
  if (!cleaned) return null;

  const parts = cleaned.split("-");
  const mainNo = parseInt(parts[0], 10);
  if (isNaN(mainNo) || mainNo <= 0) return null;

  const subNo = parts[1] ? parseInt(parts[1], 10) : 0;

  return {
    main: String(mainNo).padStart(4, "0"),
    sub: String(isNaN(subNo) ? 0 : subNo).padStart(4, "0"),
  };
}

/**
 * 주소에서 지번 부분 추출
 * "서울 강남구 역삼동 123-4" → "123-4"
 */
export function extractJibunFromAddress(address: string): string | null {
  // 숫자-숫자 또는 숫자로 끝나는 패턴
  const match = address.match(/(\d+(?:-\d+)?)\s*$/);
  return match ? match[1] : null;
}

/**
 * 주소가 산(山)인지 판별
 * "서울 강남구 역삼동 산 123" → true
 */
export function isMountainLot(address: string): boolean {
  return /산\s*\d/.test(address);
}

/**
 * Kakao 주소 검색으로 법정동코드(10자리) + 지번 상세 조회
 */
export async function getAddressDetail(address: string): Promise<{
  bCode: string;
  mainNo: string;
  subNo: string;
  mountainYn: boolean;
} | null> {
  const kakaoKey = process.env.KAKAO_REST_KEY;
  if (!kakaoKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`,
      {
        headers: { Authorization: `KakaoAK ${kakaoKey}` },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (!res.ok) return null;

    const json = await res.json();
    const doc = json.documents?.[0];
    if (!doc?.address) return null;

    const addr = doc.address;
    const bCode = addr.b_code || "";
    const mainNo = addr.main_address_no || "";
    const subNo = addr.sub_address_no || "";
    const mountainYn = addr.mountain_yn === "Y";

    if (!bCode || bCode.length !== 10 || !mainNo) return null;

    return { bCode, mainNo, subNo, mountainYn };
  } catch {
    return null;
  }
}

/**
 * PNU 코드 생성 (19자리)
 * 법정동코드(10) + 필지구분(1) + 본번(4) + 부번(4)
 */
export function buildPnu(
  bCode: string,
  mainNo: string,
  subNo: string,
  isMountain: boolean,
): string {
  const lotType = isMountain ? "2" : "1";
  const main = String(parseInt(mainNo, 10) || 0).padStart(4, "0");
  const sub = String(parseInt(subNo, 10) || 0).padStart(4, "0");
  return `${bCode}${lotType}${main}${sub}`;
}

// ─── API 호출 ───

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7일 (공시가격은 연 1회 변동)

const ENDPOINTS = {
  land: "https://apis.data.go.kr/1611000/nsdi/IndvdLandPriceService/attr/getIndvdLandPriceAttr",
  apt: "https://apis.data.go.kr/1611000/nsdi/ApartHousingPriceService/attr/getApartHousingPriceAttr",
  house: "https://apis.data.go.kr/1611000/nsdi/IndvdHousingPriceService/attr/getIndvdHousingPriceAttr",
} as const;

async function officialPriceFetch(url: string): Promise<unknown | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "VESTRA/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** 개별공시지가 조회 */
export async function fetchLandPrice(
  pnu: string,
  year: number,
): Promise<LandPriceItem | null> {
  const cacheKey = APICache.makeKey("land-price", pnu, year);
  const cached = apiCache.get<LandPriceItem>(cacheKey);
  if (cached) return cached;

  const serviceKey = process.env.MOLIT_API_KEY;
  if (!serviceKey) return null;

  const params = new URLSearchParams({
    serviceKey,
    pnu,
    stdrYear: String(year),
    format: "json",
    numOfRows: "10",
    pageNo: "1",
  });

  const data = await officialPriceFetch(`${ENDPOINTS.land}?${params}`);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data as any)?.indvdLandPrices?.field;
  if (!items || !Array.isArray(items) || items.length === 0) return null;

  const item = items[0];
  const price = parseInt(item.pblntfPclnd, 10) || 0;
  const area = parseFloat(item.lndpclAr) || 0;

  if (price <= 0) return null;

  const result: LandPriceItem = {
    pnu,
    price,
    area,
    totalPrice: Math.round(price * area),
    landUse: item.prposAreaDstrcCodeNm || "",
    year,
  };

  apiCache.set(cacheKey, result, CACHE_TTL);
  return result;
}

/** 공동주택 공시가격 조회 */
export async function fetchAptPrice(
  pnu: string,
  year: number,
): Promise<AptPriceItem | null> {
  const cacheKey = APICache.makeKey("apt-price", pnu, year);
  const cached = apiCache.get<AptPriceItem>(cacheKey);
  if (cached) return cached;

  const serviceKey = process.env.MOLIT_API_KEY;
  if (!serviceKey) return null;

  const params = new URLSearchParams({
    serviceKey,
    pnu,
    stdrYear: String(year),
    format: "json",
    numOfRows: "10",
    pageNo: "1",
  });

  const data = await officialPriceFetch(`${ENDPOINTS.apt}?${params}`);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data as any)?.apartHousingPrices?.field;
  if (!items || !Array.isArray(items) || items.length === 0) return null;

  const item = items[0];
  const price = parseInt(item.pblntfPc, 10) || 0;

  if (price <= 0) return null;

  const result: AptPriceItem = {
    pnu,
    price: price * 10000, // 만원 → 원
    area: parseFloat(item.exclusAr) || 0,
    complexName: item.hsmpNm || "",
    dong: item.dongNm || "",
    ho: item.hoNm || "",
    year,
  };

  apiCache.set(cacheKey, result, CACHE_TTL);
  return result;
}

/** 개별주택 공시가격 조회 */
export async function fetchHousePrice(
  pnu: string,
  year: number,
): Promise<HousePriceItem | null> {
  const cacheKey = APICache.makeKey("house-price", pnu, year);
  const cached = apiCache.get<HousePriceItem>(cacheKey);
  if (cached) return cached;

  const serviceKey = process.env.MOLIT_API_KEY;
  if (!serviceKey) return null;

  const params = new URLSearchParams({
    serviceKey,
    pnu,
    stdrYear: String(year),
    format: "json",
    numOfRows: "10",
    pageNo: "1",
  });

  const data = await officialPriceFetch(`${ENDPOINTS.house}?${params}`);
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data as any)?.indvdHousingPrices?.field;
  if (!items || !Array.isArray(items) || items.length === 0) return null;

  const item = items[0];
  const price = parseInt(item.housePc, 10) || 0;

  if (price <= 0) return null;

  const result: HousePriceItem = {
    pnu,
    price: price * 10000, // 만원 → 원
    area: parseFloat(item.pltAr) || 0,
    buildingArea: parseFloat(item.archArea) || 0,
    year,
  };

  apiCache.set(cacheKey, result, CACHE_TTL);
  return result;
}

/**
 * 주소로 공시가격 종합 조회
 * 1. 카카오 API로 법정동코드 + 지번 상세 조회
 * 2. PNU 생성
 * 3. 3가지 API 병렬 호출
 */
export async function fetchOfficialPrices(
  address: string,
  year?: number,
): Promise<OfficialPriceResult | null> {
  const stdrYear = year || new Date().getFullYear();

  // 카카오 API로 주소 상세 조회
  const detail = await getAddressDetail(address);
  if (!detail) return null;

  const pnu = buildPnu(detail.bCode, detail.mainNo, detail.subNo, detail.mountainYn);

  // 3가지 API 병렬 호출
  const [landPrice, aptPrice, housePrice] = await Promise.all([
    fetchLandPrice(pnu, stdrYear),
    fetchAptPrice(pnu, stdrYear),
    fetchHousePrice(pnu, stdrYear),
  ]);

  // 최소 하나라도 결과가 있어야 반환
  if (!landPrice && !aptPrice && !housePrice) {
    // 전년도 재시도
    if (stdrYear === new Date().getFullYear()) {
      const prevYear = stdrYear - 1;
      const [landPrev, aptPrev, housePrev] = await Promise.all([
        fetchLandPrice(pnu, prevYear),
        fetchAptPrice(pnu, prevYear),
        fetchHousePrice(pnu, prevYear),
      ]);

      if (landPrev || aptPrev || housePrev) {
        return {
          landPrice: landPrev,
          aptPrice: aptPrev,
          housePrice: housePrev,
          pnu,
          address,
          year: prevYear,
        };
      }
    }
    return null;
  }

  return { landPrice, aptPrice, housePrice, pnu, address, year: stdrYear };
}
