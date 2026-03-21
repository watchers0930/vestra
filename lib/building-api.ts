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
  // ── 서울특별시 주요 구 ──
  "11680": "10300", // 강남구 역삼동
  "11650": "10800", // 서초구 서초동
  "11710": "10100", // 송파구 잠실동
  "11440": "10500", // 마포구 합정동
  "11170": "10000", // 용산구 후암동
  "11200": "10000", // 성동구 성수동
  "11560": "10000", // 영등포구 여의도동
  "11110": "10000", // 종로구
  "11740": "10100", // 강동구 천호동
  "11500": "10100", // 강서구 화곡동
  "11350": "10100", // 노원구 상계동
  "11290": "10100", // 성북구 돈암동
  "11230": "10100", // 동대문구 전농동
  "11590": "10000", // 동작구 노량진동
  "11470": "10000", // 양천구 목동
  "11530": "10100", // 구로구 구로동
  "11620": "10100", // 관악구 봉천동
  "11305": "10100", // 강북구 미아동
  "11320": "10100", // 도봉구 도봉동
  "11215": "10100", // 광진구 자양동
  "11260": "10100", // 중랑구 면목동
  "11380": "10100", // 은평구 응암동
  "11410": "10100", // 서대문구 연희동
  "11545": "10100", // 금천구 가산동

  // ── 경기도 주요 시 ──
  "41110": "10100", // 수원시 장안구
  "41130": "10100", // 수원시 권선구
  "41150": "10100", // 수원시 팔달구
  "41170": "10100", // 수원시 영통구
  "41131": "10100", // 성남시 수정구
  "41133": "10100", // 성남시 중원구
  "41135": "10100", // 성남시 분당구
  "41280": "10100", // 고양시 덕양구
  "41285": "10100", // 고양시 일산동구
  "41287": "10100", // 고양시 일산서구
  "41460": "10100", // 용인시 처인구
  "41461": "10100", // 용인시 기흥구
  "41463": "10100", // 용인시 수지구
  "41590": "10100", // 화성시
  "41190": "10100", // 부천시
  "41270": "10100", // 안산시 상록구
  "41273": "10100", // 안산시 단원구
  "41171": "10100", // 안양시 만안구
  "41173": "10100", // 안양시 동안구

  // ── 인천광역시 ──
  "28110": "10100", // 중구
  "28140": "10100", // 동구
  "28177": "10100", // 미추홀구
  "28185": "10100", // 연수구
  "28200": "10100", // 남동구
  "28237": "10100", // 부평구
  "28245": "10100", // 계양구
  "28260": "10100", // 서구

  // ── 부산광역시 ──
  "26110": "10100", // 중구
  "26140": "10100", // 서구
  "26170": "10100", // 동구
  "26200": "10100", // 영도구
  "26230": "10100", // 부산진구
  "26260": "10100", // 동래구
  "26290": "10100", // 남구
  "26320": "10100", // 북구
  "26350": "10100", // 해운대구
  "26380": "10100", // 사하구
  "26410": "10100", // 금정구
  "26440": "10100", // 강서구
  "26470": "10100", // 연제구
  "26500": "10100", // 수영구
  "26530": "10100", // 사상구

  // ── 대구광역시 ──
  "27110": "10100", // 중구
  "27140": "10100", // 동구
  "27170": "10100", // 서구
  "27200": "10100", // 남구
  "27230": "10100", // 북구
  "27260": "10100", // 수성구
  "27290": "10100", // 달서구
  "27710": "10100", // 달성군

  // ── 대전광역시 ──
  "30110": "10100", // 동구
  "30140": "10100", // 중구
  "30170": "10100", // 서구
  "30200": "10100", // 유성구
  "30230": "10100", // 대덕구

  // ── 광주광역시 ──
  "29110": "10100", // 동구
  "29140": "10100", // 서구
  "29155": "10100", // 남구
  "29170": "10100", // 북구
  "29200": "10100", // 광산구

  // ── 세종특별자치시 ──
  "36110": "10100", // 세종시
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
