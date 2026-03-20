/**
 * VESTRA 건축물대장 API 클라이언트
 * ────────────────────────────────
 * 국토교통부 건축물대장정보 서비스 API를 통해
 * 건물 기본정보 (면적, 용도, 건축년도, 구조 등)를 조회.
 *
 * data.go.kr 동일 인증키 사용. 미구독 시 graceful fallback.
 */

import { apiCache, APICache } from "./api-cache";
import { extractLawdCode } from "./molit-api";

export interface BuildingInfo {
  address: string;        // 도로명주소 또는 지번주소
  buildingName: string;   // 건물명
  mainPurpose: string;    // 주용도 (아파트, 오피스텔 등)
  structure: string;      // 구조 (철근콘크리트 등)
  totalArea: number;      // 연면적 (㎡)
  buildDate: string;      // 사용승인일 (YYYYMMDD)
  buildYear: number;      // 건축년도
  floors: number;         // 지상 층수
  undergroundFloors: number; // 지하 층수
  elevatorCount: number;  // 승강기 수
  parkingCount: number;   // 주차 대수
  households: number;     // 세대수
  floorAreaRatio: number; // 용적률 (%)
  buildingCoverage: number; // 건폐율 (%)
}

/** XML에서 태그 값 추출 */
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>\\s*([^<]*)\\s*</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

/**
 * 주소에서 법정동코드 추출을 위한 매핑
 * LAWD_CODE(시군구 5자리)에서 기본 법정동코드를 유추
 */
const BJDONG_DEFAULTS: Record<string, string> = {
  // 서울 주요 구
  "11680": "10300", // 강남구 역삼동
  "11650": "10800", // 서초구 서초동
  "11710": "10100", // 송파구 잠실동
  "11440": "10500", // 마포구 합정동
};

/**
 * 건축물대장 기본정보 조회
 *
 * @param sigunguCd - 시군구코드 (5자리)
 * @param bjdongCd - 법정동코드 (5자리)
 * @param bun - 본번 (4자리, 예: "0012")
 * @param ji - 부번 (4자리, 예: "0000")
 */
export async function fetchBuildingInfo(
  sigunguCd: string,
  bjdongCd: string,
  bun: string = "",
  ji: string = ""
): Promise<BuildingInfo | null> {
  const serviceKey = process.env.MOLIT_API_KEY;
  if (!serviceKey) return null;

  const cacheKey = APICache.makeKey("building", sigunguCd, bjdongCd, bun, ji);
  const cached = apiCache.get<BuildingInfo>(cacheKey);
  if (cached) return cached;

  const baseUrl =
    "http://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo";

  const params = new URLSearchParams({
    serviceKey,
    sigunguCd,
    bjdongCd,
    pageNo: "1",
    numOfRows: "5",
    _type: "xml",
  });
  if (bun) params.set("bun", bun);
  if (ji) params.set("ji", ji);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/xml" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Building API error: ${res.status}`);
      return null;
    }

    const xml = await res.text();
    if (!xml.includes("<item>")) return null;

    const indoorParking = parseInt(extractTag(xml, "indrMechUtcnt"), 10) || 0;
    const outdoorParking = parseInt(extractTag(xml, "oudrMechUtcnt"), 10) || 0;
    const indoorSelf = parseInt(extractTag(xml, "indrAutoUtcnt"), 10) || 0;
    const outdoorSelf = parseInt(extractTag(xml, "oudrAutoUtcnt"), 10) || 0;

    const result: BuildingInfo = {
      address: extractTag(xml, "platPlc") || extractTag(xml, "newPlatPlc"),
      buildingName: extractTag(xml, "bldNm"),
      mainPurpose: extractTag(xml, "mainPurpsCdNm"),
      structure: extractTag(xml, "strctCdNm"),
      totalArea: parseFloat(extractTag(xml, "totArea")) || 0,
      buildDate: extractTag(xml, "useAprDay"),
      buildYear: parseInt(extractTag(xml, "useAprDay")?.substring(0, 4), 10) || 0,
      floors: parseInt(extractTag(xml, "grndFlrCnt"), 10) || 0,
      undergroundFloors: parseInt(extractTag(xml, "ugrndFlrCnt"), 10) || 0,
      elevatorCount: parseInt(extractTag(xml, "rideUseElvtCnt"), 10) || 0,
      parkingCount: indoorParking + outdoorParking + indoorSelf + outdoorSelf,
      households: parseInt(extractTag(xml, "hhldCnt"), 10) || 0,
      floorAreaRatio: parseFloat(extractTag(xml, "vlRat")) || 0,
      buildingCoverage: parseFloat(extractTag(xml, "bcRat")) || 0,
    };

    apiCache.set(cacheKey, result, 7 * 24 * 60 * 60 * 1000); // 7일 캐시
    return result;
  } catch (error) {
    console.warn("Building API fetch error:", error);
    return null;
  }
}

/**
 * 주소 문자열 기반 건축물대장 조회
 *
 * MOLIT의 extractLawdCode를 재사용하여 주소에서 시군구코드 추출 후 조회.
 */
export async function fetchBuildingInfoByAddress(
  address: string
): Promise<BuildingInfo | null> {
  const lawdCode = extractLawdCode(address);
  if (!lawdCode) return null;

  const sigunguCd = lawdCode.substring(0, 5);
  const bjdongCd = BJDONG_DEFAULTS[sigunguCd] || "10100";

  try {
    return await fetchBuildingInfo(sigunguCd, bjdongCd);
  } catch {
    return null;
  }
}
