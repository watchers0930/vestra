/**
 * VESTRA 건축물대장 API 클라이언트
 * ────────────────────────────────
 * 국토교통부 건축물대장정보 서비스 API를 통해
 * 건물 기본정보 (면적, 용도, 건축년도, 구조 등)를 조회.
 *
 * data.go.kr 동일 인증키 사용. 미구독 시 graceful fallback.
 */

export interface BuildingInfo {
  address: string;        // 도로명주소 또는 지번주소
  buildingName: string;   // 건물명
  mainPurpose: string;    // 주용도 (아파트, 오피스텔 등)
  structure: string;      // 구조 (철근콘크리트 등)
  totalArea: number;      // 연면적 (㎡)
  buildDate: string;      // 사용승인일
  floors: number;         // 지상 층수
  undergroundFloors: number; // 지하 층수
  elevatorCount: number;  // 승강기 수
  parkingCount: number;   // 주차 대수
}

/** XML에서 태그 값 추출 */
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>\\s*([^<]*)\\s*</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

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

  const baseUrl =
    "http://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo";

  const params = new URLSearchParams({
    serviceKey,
    sigunguCd,
    bjdongCd,
    pageNo: "1",
    numOfRows: "1",
  });
  if (bun) params.set("bun", bun);
  if (ji) params.set("ji", ji);

  try {
    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: { Accept: "application/xml" },
    });
    if (!res.ok) {
      console.warn(`Building API error: ${res.status}`);
      return null;
    }

    const xml = await res.text();

    // 응답에 item이 없으면 데이터 없음
    if (!xml.includes("<item>")) return null;

    return {
      address: extractTag(xml, "platPlc") || extractTag(xml, "newPlatPlc"),
      buildingName: extractTag(xml, "bldNm"),
      mainPurpose: extractTag(xml, "mainPurpsCdNm"),
      structure: extractTag(xml, "strctCdNm"),
      totalArea: parseFloat(extractTag(xml, "totArea")) || 0,
      buildDate: extractTag(xml, "useAprDay"),
      floors: parseInt(extractTag(xml, "grndFlrCnt"), 10) || 0,
      undergroundFloors: parseInt(extractTag(xml, "ugrndFlrCnt"), 10) || 0,
      elevatorCount: parseInt(extractTag(xml, "rideUseElvtCnt"), 10) || 0,
      parkingCount: parseInt(extractTag(xml, "indrMechUtcnt"), 10) +
                    parseInt(extractTag(xml, "oudrMechUtcnt"), 10) || 0,
    };
  } catch (error) {
    console.warn("Building API fetch error:", error);
    return null;
  }
}

/**
 * 주소 기반 건축물대장 간편 조회
 *
 * 시군구코드(LAWD_CD 앞 5자리)와 법정동코드를 기반으로 조회를 시도.
 * 정확한 본번/부번이 없으면 해당 지역의 첫 번째 건물 정보를 반환.
 */
export async function fetchBuildingInfoByAddress(
  sigunguCd: string
): Promise<BuildingInfo | null> {
  // sigunguCd를 5자리로 사용, bjdongCd는 기본값 "10100" (일반적인 법정동)
  // 정확한 법정동코드가 없으면 시군구 단위로 조회
  try {
    return await fetchBuildingInfo(sigunguCd, "10100");
  } catch {
    return null;
  }
}
