/**
 * VESTRA K-apt API 클라이언트
 * ─────────────────────────────────
 * 공공데이터포털(data.go.kr)의 K-apt API를 호출하여
 * 아파트 단지 기본정보(시공사, 복도유형 등) 및
 * 상세정보(CCTV, 편의시설 등)를 조회.
 *
 * KAPT_API_KEY 사용 (MOLIT_API_KEY와 별도 계정).
 * 응답: JSON. 미구독 시 graceful fallback(null).
 */

import { apiCache, APICache } from "./api-cache";
import { extractLawdCode } from "./molit-api";

// ─── 타입 정의 ───

export interface KaptBasicInfo {
  kaptCode: string;        // 단지코드
  kaptName: string;        // 단지명
  address: string;         // 법정동주소
  doroAddress: string;     // 도로명주소
  households: number;      // 세대수
  dongCount: number;       // 동수
  constructorName: string; // 시공사
  developerName: string;   // 시행사
  corridorType: string;    // 복도유형 (계단식/복도식/혼합식)
  heatingType: string;     // 난방방식
  approvalDate: string;    // 사용승인일
  totalArea: number;       // 연면적
  unitsByArea: string;     // 전용면적별 세대현황
}

export interface KaptDetailInfo {
  cctvCount: number;       // CCTV 대수
  parkingTotal: number;    // 총 주차대수
  parkingGround: number;   // 지상 주차
  parkingUnder: number;    // 지하 주차
  elevatorCount: number;   // 승강기 대수
  evChargerCount: number;  // 전기차 충전대수
  facilities: string;      // 부대복리시설
  convFacilities: string;  // 편의시설
  eduFacilities: string;   // 교육시설
}

export interface KaptInfo extends KaptBasicInfo, KaptDetailInfo {}

interface KaptAptListItem {
  kaptCode: string;
  kaptName: string;
}

// ─── 캐시 TTL ───

const TTL_24H = 24 * 60 * 60 * 1000;
const TTL_7D = 7 * 24 * 60 * 60 * 1000;

// ─── K-apt API 공통 fetch (JSON) ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function kaptFetchJson(url: string): Promise<any | null> {
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

/** KAPT_API_KEY 조회 (MOLIT_API_KEY와 별도) */
function getKaptKey(): string | null {
  return process.env.KAPT_API_KEY || process.env.MOLIT_API_KEY || null;
}

// ─── 단지 목록 조회 ───

/**
 * 시군구별 K-apt 단지 목록 조회
 * @param sggCode - 법정동코드 5자리 (시군구)
 */
export async function fetchKaptAptList(
  sggCode: string
): Promise<KaptAptListItem[]> {
  const cacheKey = APICache.makeKey("kapt-list", sggCode);
  const cached = apiCache.get<KaptAptListItem[]>(cacheKey);
  if (cached) return cached;

  const serviceKey = getKaptKey();
  if (!serviceKey) return [];

  const params = new URLSearchParams({
    serviceKey,
    sigunguCode: sggCode,
    numOfRows: "1000",
    pageNo: "1",
  });

  const baseUrl =
    "https://apis.data.go.kr/1613000/AptListService3/getSigunguAptList3";
  const json = await kaptFetchJson(`${baseUrl}?${params.toString()}`);
  if (!json) return [];

  const rawItems = json?.response?.body?.items;
  if (!rawItems || !Array.isArray(rawItems)) return [];

  const items: KaptAptListItem[] = rawItems
    .filter((item: { kaptCode?: string; kaptName?: string }) => item.kaptCode && item.kaptName)
    .map((item: { kaptCode: string; kaptName: string }) => ({
      kaptCode: item.kaptCode,
      kaptName: item.kaptName,
    }));

  if (items.length > 0) {
    apiCache.set(cacheKey, items, TTL_24H);
  }
  return items;
}

// ─── 기본정보 조회 ───

/**
 * K-apt 단지 기본정보 조회
 * @param kaptCode - 단지코드
 */
export async function fetchKaptBasicInfo(
  kaptCode: string
): Promise<KaptBasicInfo | null> {
  const cacheKey = APICache.makeKey("kapt-basic", kaptCode);
  const cached = apiCache.get<KaptBasicInfo>(cacheKey);
  if (cached) return cached;

  const serviceKey = getKaptKey();
  if (!serviceKey) return null;

  const params = new URLSearchParams({ serviceKey, kaptCode });

  const baseUrl =
    "https://apis.data.go.kr/1613000/AptBasisInfoServiceV4/getAphusBassInfoV4";
  const json = await kaptFetchJson(`${baseUrl}?${params.toString()}`);
  if (!json) return null;

  const item = json?.response?.body?.item;
  if (!item) return null;

  const result: KaptBasicInfo = {
    kaptCode,
    kaptName: item.kaptName || "",
    address: item.doroJuso || item.kaptAddr || "",
    doroAddress: item.doroJuso || "",
    households: parseInt(item.hoCnt ?? item.kaptdaCnt, 10) || 0,
    dongCount: parseInt(item.kaptDongCnt, 10) || 0,
    constructorName: item.kaptBcompany || "",
    developerName: item.kaptAcompany || "",
    corridorType: item.codeHallNm || "",
    heatingType: item.codeHeatNm || "",
    approvalDate: item.kaptUsedate || "",
    totalArea: parseFloat(item.kaptMarea ?? item.kaptTarea) || 0,
    unitsByArea: item.privArea || "",
  };

  apiCache.set(cacheKey, result, TTL_7D);
  return result;
}

// ─── 상세정보 조회 ───

/**
 * K-apt 단지 상세정보 조회 (CCTV, 편의시설 등)
 * @param kaptCode - 단지코드
 */
export async function fetchKaptDetailInfo(
  kaptCode: string
): Promise<KaptDetailInfo | null> {
  const cacheKey = APICache.makeKey("kapt-detail", kaptCode);
  const cached = apiCache.get<KaptDetailInfo>(cacheKey);
  if (cached) return cached;

  const serviceKey = getKaptKey();
  if (!serviceKey) return null;

  const params = new URLSearchParams({ serviceKey, kaptCode });

  const baseUrl =
    "https://apis.data.go.kr/1613000/AptBasisInfoServiceV4/getAphusDtlInfoV4";
  const json = await kaptFetchJson(`${baseUrl}?${params.toString()}`);
  if (!json) return null;

  const item = json?.response?.body?.item;
  if (!item) return null;

  const ground = parseInt(item.kaptdPcnt, 10) || 0;
  const under = parseInt(item.kaptdPcntu, 10) || 0;

  const result: KaptDetailInfo = {
    cctvCount: parseInt(item.kaptdCccnt, 10) || 0,
    parkingTotal: ground + under,
    parkingGround: ground,
    parkingUnder: under,
    elevatorCount: parseInt(item.kaptdEcnt, 10) || 0,
    evChargerCount:
      (parseInt(item.groundElChargerCnt, 10) || 0) +
      (parseInt(item.undergroundElChargerCnt, 10) || 0),
    facilities: item.welfareFacility || "",
    convFacilities: item.convenientFacility || "",
    eduFacilities: item.educationFacility || "",
  };

  apiCache.set(cacheKey, result, TTL_7D);
  return result;
}

// ─── 기본+상세 병합 조회 ───

/**
 * K-apt 기본정보 + 상세정보 병합 조회
 * @param kaptCode - 단지코드
 */
export async function fetchKaptInfo(
  kaptCode: string
): Promise<KaptInfo | null> {
  const cacheKey = APICache.makeKey("kapt-info", kaptCode);
  const cached = apiCache.get<KaptInfo>(cacheKey);
  if (cached) return cached;

  const [basic, detail] = await Promise.all([
    fetchKaptBasicInfo(kaptCode),
    fetchKaptDetailInfo(kaptCode),
  ]);

  if (!basic) return null;

  const result: KaptInfo = {
    ...basic,
    cctvCount: detail?.cctvCount ?? 0,
    parkingTotal: detail?.parkingTotal ?? 0,
    parkingGround: detail?.parkingGround ?? 0,
    parkingUnder: detail?.parkingUnder ?? 0,
    elevatorCount: detail?.elevatorCount ?? 0,
    evChargerCount: detail?.evChargerCount ?? 0,
    facilities: detail?.facilities ?? "",
    convFacilities: detail?.convFacilities ?? "",
    eduFacilities: detail?.eduFacilities ?? "",
  };

  apiCache.set(cacheKey, result, TTL_7D);
  return result;
}

// ─── 주소 → kaptCode 자동 매칭 ───

/**
 * 주소에서 K-apt 단지코드를 자동 매칭
 *
 * 1) 주소에서 법정동코드(시군구) 추출
 * 2) 해당 시군구의 단지 목록 조회
 * 3) 주소/아파트명으로 가장 유사한 단지 매칭
 */
export async function findKaptCode(
  address: string,
  buildingName?: string
): Promise<string | null> {
  const cacheKey = APICache.makeKey("kapt-find", address + (buildingName || ""));
  const cached = apiCache.get<string>(cacheKey);
  if (cached) return cached;

  const lawdCode = extractLawdCode(address);
  if (!lawdCode) return null;

  const aptList = await fetchKaptAptList(lawdCode);
  if (aptList.length === 0) return null;

  // 1) 건물명 힌트가 있으면 우선 매칭 (카카오 지오코딩 building_name)
  if (buildingName) {
    const clean = buildingName.replace(/아파트|APT|apt|단지|\s/gi, "");
    if (clean.length >= 1) {
      for (const apt of aptList) {
        const name = apt.kaptName.replace(/\s/g, "");
        if (name === clean || name.includes(clean) || clean.includes(name)) {
          apiCache.set(cacheKey, apt.kaptCode, TTL_24H);
          return apt.kaptCode;
        }
      }
    }
  }

  // 2) 주소에서 단지명 힌트 추출 (기존 로직)
  const tokens = address.trim().split(/\s+/);
  let aptHintTokens: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^.{1,10}[동읍면리가]$/.test(t) && !/[시도구군]$/.test(t.slice(0, -1))) {
      aptHintTokens = tokens.slice(i + 1).filter(
        (s) => !/^\d+[-\d]*$/.test(s) && s.length >= 2
      );
      break;
    }
  }

  const searchTerms = aptHintTokens.length > 0
    ? aptHintTokens
    : tokens.filter((t) => t.length >= 2 && !/[시도구군동읍면리가]$/.test(t) && !/^\d+[-\d]*$/.test(t));

  if (searchTerms.length === 0) return null;

  let bestMatch: KaptAptListItem | null = null;
  let bestScore = 0;

  for (const apt of aptList) {
    let score = 0;
    const name = apt.kaptName.replace(/\s/g, "");
    for (const term of searchTerms) {
      const t = term.replace(/\s/g, "");
      if (name === t) { score += 10; }
      else if (name.includes(t)) { score += 5; }
      else if (t.includes(name)) { score += 3; }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = apt;
    }
  }

  if (!bestMatch || bestScore === 0) return null;

  apiCache.set(cacheKey, bestMatch.kaptCode, TTL_24H);
  return bestMatch.kaptCode;
}

// ─── 주소 기반 통합 조회 (편의 함수) ───

/**
 * 주소로 K-apt 통합 정보 조회
 * findKaptCode → fetchKaptInfo 순차 호출
 */
export async function fetchKaptInfoByAddress(
  address: string,
  buildingName?: string
): Promise<KaptInfo | null> {
  try {
    const kaptCode = await findKaptCode(address, buildingName);
    if (!kaptCode) return null;
    return await fetchKaptInfo(kaptCode);
  } catch {
    return null;
  }
}
