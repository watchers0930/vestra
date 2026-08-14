/**
 * VESTRA 공시가격 조회 API 클라이언트
 * ─────────────────────────────────────────
 * VWorld NED 공시가격 API 호출 유틸.
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
  /** 입력 주소의 동/호와 실제로 일치한 세대인지 여부.
   *  - true: 입력 동/호 세대를 정확히 찾음
   *  - false: 입력 동/호를 못 찾아 단지 대표 세대를 반환함
   *  - undefined: 동/호 정보가 입력되지 않음(단지 대표 세대) */
  matched?: boolean;
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
 * 주소 문자열에서 공동주택 동/호 추출
 * "경기 광명시 철산동 367 108동 1403호" → { dong: "108", ho: "1403" }
 * 숫자+"동"/"호" 패턴만 매칭하므로 "역삼동" 같은 법정동명은 걸리지 않는다.
 * 동 또는 호 중 하나도 없으면 null (단지 대표 세대 조회로 폴백)
 */
export function parseUnit(address: string): { dong: string; ho: string } | null {
  const dongM = address.match(/(\d+)\s*동/);
  const hoM = address.match(/(\d+)\s*호/);
  if (!dongM && !hoM) return null;
  return { dong: dongM ? dongM[1] : "", ho: hoM ? hoM[1] : "" };
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
 * 좌표(lat/lng)로 법정동코드 + 지번 상세 조회 (역지오코딩)
 * coord2address(지번) + coord2regioncode(법정동코드) 병렬 호출
 */
export async function getAddressDetailByCoord(lat: number, lng: number): Promise<{
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
    const headers = { Authorization: `KakaoAK ${kakaoKey}` };
    const opts = { headers, signal: controller.signal };

    const [addrRes, regionRes] = await Promise.all([
      fetch(`https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}&input_coord=WGS84`, opts),
      fetch(`https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}&input_coord=WGS84`, opts),
    ]);
    clearTimeout(timeout);

    if (!addrRes.ok || !regionRes.ok) return null;

    const [addrJson, regionJson] = await Promise.all([addrRes.json(), regionRes.json()]);

    const addrDoc = addrJson.documents?.[0];
    if (!addrDoc?.address) return null;

    // coord2regioncode에서 법정동(B) 코드 추출
    const bDoc = regionJson.documents?.find((d: { region_type: string }) => d.region_type === "B");
    const bCode = bDoc?.code || "";

    const addr = addrDoc.address;
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

const VWORLD_BASE = "https://api.vworld.kr/ned/data";
const ENDPOINTS = {
  land: `${VWORLD_BASE}/getIndvdLandPriceAttr`,
  apt: `${VWORLD_BASE}/getApartHousingPriceAttr`,
  house: `${VWORLD_BASE}/getIndvdHousingPriceAttr`,
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

/** VWorld API 공통 파라미터 생성 */
function vworldParams(pnu: string, year: number): URLSearchParams {
  const key = process.env.VWORLD_API_KEY;
  if (!key) return new URLSearchParams();
  return new URLSearchParams({
    key,
    pnu,
    stdrYear: String(year),
    format: "json",
    numOfRows: "10",
    pageNo: "1",
    domain: "vestra-plum.vercel.app",
  });
}

/** 개별공시지가 조회 */
export async function fetchLandPrice(
  pnu: string,
  year: number,
): Promise<LandPriceItem | null> {
  const cacheKey = APICache.makeKey("land-price", pnu, year);
  const cached = apiCache.get<LandPriceItem>(cacheKey);
  if (cached) return cached;

  if (!process.env.VWORLD_API_KEY) return null;

  const params = vworldParams(pnu, year);
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAptItem(item: any, pnu: string, year: number): AptPriceItem | null {
  const price = parseInt(item.pblntfPc, 10) || 0;
  if (price <= 0) return null;
  return {
    pnu,
    price,  // VWorld는 원 단위로 반환
    area: parseFloat(item.prvuseAr || item.exclusAr) || 0,
    complexName: item.aphusNm || item.hsmpNm || "",
    dong: item.dongNm || "",
    ho: item.hoNm || "",
    year,
  };
}

// 공동주택 API 한 페이지 조회 → { items, totalCount }
async function fetchAptPage(
  pnu: string,
  year: number,
  pageNo: number,
  numOfRows: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ items: any[]; totalCount: number }> {
  const params = vworldParams(pnu, year);
  params.set("pageNo", String(pageNo));
  params.set("numOfRows", String(numOfRows));
  const data = await officialPriceFetch(`${ENDPOINTS.apt}?${params}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resp = (data as any)?.response ?? (data as any)?.apartHousingPrices;
  const items = Array.isArray(resp?.field) ? resp.field : [];
  const totalCount = parseInt(resp?.totalCount, 10) || items.length;
  return { items, totalCount };
}

/**
 * 공동주택 공시가격 조회
 *
 * 하나의 PNU(단지 필지)에 수천 세대가 매달려 있으므로, VWorld는 PNU로 조회 시
 * 세대 목록을 페이지네이션으로 반환한다(동/호 필터 파라미터 없음).
 *  - unit 지정 시: 세대 목록을 순회하며 입력 동/호와 일치하는 세대를 찾아 반환.
 *    못 찾으면 대표(첫) 세대 + matched:false.
 *  - unit 미지정 시: 기존 동작(첫 세대) 유지 → 단지 대표 공시가.
 */
export async function fetchAptPrice(
  pnu: string,
  year: number,
  unit?: { dong: string; ho: string },
): Promise<AptPriceItem | null> {
  if (!process.env.VWORLD_API_KEY) return null;

  const unitKey = unit ? `${unit.dong}-${unit.ho}` : "";
  const cacheKey = APICache.makeKey("apt-price", pnu, year, unitKey);
  const cached = apiCache.get<AptPriceItem>(cacheKey);
  if (cached) return cached;

  // ── unit 미지정: 기존 동작(첫 세대 = 단지 대표) ──
  if (!unit || (!unit.dong && !unit.ho)) {
    const { items } = await fetchAptPage(pnu, year, 1, 10);
    if (items.length === 0) return null;
    const result = toAptItem(items[0], pnu, year);
    if (!result) return null;
    apiCache.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  // ── unit 지정: 전 세대 순회하며 동/호 매칭(early-exit) ──
  const PAGE_SIZE = 1000;
  const MAX_PAGES = 10; // 최대 1만 세대까지 스캔 (초대형 단지 안전장치)
  const wantDong = unit.dong ? parseInt(unit.dong, 10) : null;
  const wantHo = unit.ho ? parseInt(unit.ho, 10) : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let firstItem: any = null;
  let totalCount = Infinity;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items, totalCount: tc } = await fetchAptPage(pnu, year, page, PAGE_SIZE);
    if (page === 1) {
      totalCount = tc;
      if (items.length === 0) return null;
      firstItem = items[0];
    }
    for (const it of items) {
      const dongOk = wantDong == null || (parseInt(it.dongNm, 10) || 0) === wantDong;
      const hoOk = wantHo == null || (parseInt(it.hoNm, 10) || 0) === wantHo;
      if (dongOk && hoOk) {
        const matchedResult = toAptItem(it, pnu, year);
        if (matchedResult) {
          matchedResult.matched = true;
          apiCache.set(cacheKey, matchedResult, CACHE_TTL);
          return matchedResult;
        }
      }
    }
    if (page * PAGE_SIZE >= totalCount) break; // 마지막 페이지 도달
  }

  // 매칭 실패 → 단지 대표(첫) 세대 + matched:false
  const fallback = firstItem ? toAptItem(firstItem, pnu, year) : null;
  if (!fallback) return null;
  fallback.matched = false;
  apiCache.set(cacheKey, fallback, CACHE_TTL);
  return fallback;
}

/** 개별주택 공시가격 조회 */
export async function fetchHousePrice(
  pnu: string,
  year: number,
): Promise<HousePriceItem | null> {
  const cacheKey = APICache.makeKey("house-price", pnu, year);
  const cached = apiCache.get<HousePriceItem>(cacheKey);
  if (cached) return cached;

  if (!process.env.VWORLD_API_KEY) return null;

  const params = vworldParams(pnu, year);
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
    price,  // VWorld는 원 단위로 반환
    area: parseFloat(item.ladRegstrAr || item.pltAr) || 0,
    buildingArea: parseFloat(item.buldCalcTotAr || item.archArea) || 0,
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
  coord?: { lat: number; lng: number },
): Promise<OfficialPriceResult | null> {
  const stdrYear = year || new Date().getFullYear();

  // 카카오 API로 주소 상세 조회 (주소 → 좌표 역지오코딩 폴백)
  const detail = await getAddressDetail(address)
    ?? (coord ? await getAddressDetailByCoord(coord.lat, coord.lng) : null);
  if (!detail) return null;

  const pnu = buildPnu(detail.bCode, detail.mainNo, detail.subNo, detail.mountainYn);

  // 주소에 동/호가 있으면 해당 세대의 공동주택 공시가를 특정
  const unit = parseUnit(address) ?? undefined;

  // 3가지 API 병렬 호출
  const [landPrice, aptPrice, housePrice] = await Promise.all([
    fetchLandPrice(pnu, stdrYear),
    fetchAptPrice(pnu, stdrYear, unit),
    fetchHousePrice(pnu, stdrYear),
  ]);

  // 최소 하나라도 결과가 있어야 반환
  if (!landPrice && !aptPrice && !housePrice) {
    // 전년도 재시도
    if (stdrYear === new Date().getFullYear()) {
      const prevYear = stdrYear - 1;
      const [landPrev, aptPrev, housePrev] = await Promise.all([
        fetchLandPrice(pnu, prevYear),
        fetchAptPrice(pnu, prevYear, unit),
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
