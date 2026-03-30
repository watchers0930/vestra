/**
 * CODEF API 클라이언트
 * ──────────────────
 * 인터넷등기소 부동산등기부등본 자동 조회를 위한 CODEF REST API 래퍼.
 * OAuth 2.0 토큰 관리 + 부동산 주소 검색 + 등기부등본 열람.
 *
 * @see https://developer.codef.io
 */

import { apiCache, APICache } from "./api-cache";

// ─── 상수 ───

const CODEF_OAUTH_URL = "https://oauth.codef.io/oauth/token";
const CODEF_DEMO_BASE = "https://development.codef.io";
// 프로덕션 전환 시: const CODEF_PROD_BASE = "https://api.codef.io";

// 공공 부동산 API 엔드포인트
const PRODUCT_REGISTRY = "/v1/kr/public/ck/real-estate-register/status";
const PRODUCT_ADDRESS = "/v1/kr/public/ck/real-estate-address/search";

// 토큰 TTL: 6일 (실제 7일이지만 여유분)
const TOKEN_TTL = 6 * 24 * 60 * 60 * 1000;
// 등기부 조회 결과 캐시: 1시간
const REGISTRY_CACHE_TTL = 60 * 60 * 1000;
// 주소 검색 결과 캐시: 30분
const ADDRESS_CACHE_TTL = 30 * 60 * 1000;

// ─── 환경 변수 ───

function getCodefConfig() {
  const clientId = process.env.CODEF_DEMO_CLIENT_ID;
  const clientSecret = process.env.CODEF_DEMO_CLIENT_SECRET;
  const publicKey = process.env.CODEF_PUBLIC_KEY;

  if (!clientId || !clientSecret) {
    throw new Error("CODEF API 키가 설정되지 않았습니다. (CODEF_DEMO_CLIENT_ID, CODEF_DEMO_CLIENT_SECRET)");
  }

  return {
    clientId,
    clientSecret,
    publicKey: publicKey || "",
    // 데모 환경 사용 (프로덕션 전환 시 CODEF_API_BASE로 변경)
    baseUrl: CODEF_DEMO_BASE,
  };
}

// ─── 타입 ───

export interface CodefTokenResult {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface CodefAddressResult {
  /** 고유번호 */
  uniqueNo: string;
  /** 주소 */
  address: string;
  /** 부동산 유형 (토지, 건물, 집합건물) */
  realEstateType: string;
  /** 부동산 유형 코드 */
  realEstateTypeCode: string;
}

export interface CodefRegistryResult {
  /** 원본 텍스트 (파싱 엔진 입력용) */
  text: string;
  /** 등기부 유형 */
  registerType: string;
  /** 부동산 고유번호 */
  uniqueNo: string;
  /** 주소 */
  address: string;
  /** 원본 응답 데이터 */
  rawData: Record<string, unknown>;
}

export interface CodefApiResponse {
  result: {
    code: string;
    extraMessage: string;
    message: string;
    transactionId: string;
  };
  data: Record<string, unknown> | Record<string, unknown>[];
}

// ─── OAuth 토큰 ───

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getCodefToken(): Promise<string> {
  // 캐시된 토큰이 유효하면 재사용
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const config = getCodefConfig();
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const res = await fetch(CODEF_OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=read",
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`CODEF 토큰 발급 실패 (${res.status}): ${errText}`);
  }

  const data: CodefTokenResult = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + TOKEN_TTL,
  };

  return data.access_token;
}

// ─── API 호출 공통 ───

async function codefRequest(
  productPath: string,
  params: Record<string, unknown>,
): Promise<CodefApiResponse> {
  const config = getCodefConfig();
  const token = await getCodefToken();

  const res = await fetch(`${config.baseUrl}${productPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`CODEF API 오류 (${res.status}): ${errText}`);
  }

  // CODEF는 URL-encoded JSON을 반환하는 경우가 있음
  const rawText = await res.text();
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawText);
  } catch {
    decoded = rawText;
  }

  let data: CodefApiResponse;
  try {
    data = JSON.parse(decoded);
  } catch (parseErr) {
    throw new Error(
      `CODEF 응답 파싱 실패: ${parseErr instanceof Error ? parseErr.message : String(parseErr)} (원본: ${decoded.slice(0, 200)})`
    );
  }

  // 응답 구조 검증
  if (!data?.result?.code) {
    throw new Error(`CODEF 응답 구조 오류: result.code가 없습니다 (원본: ${decoded.slice(0, 200)})`);
  }

  // CODEF 결과 코드 확인
  if (data.result.code !== "CF-00000" && data.result.code !== "CF-03002") {
    throw new Error(
      `CODEF 오류 [${data.result.code}]: ${data.result.message} ${data.result.extraMessage || ""}`.trim()
    );
  }

  return data;
}

// ─── 부동산 주소 검색 ───

export async function searchAddress(address: string): Promise<CodefAddressResult[]> {
  const cacheKey = APICache.makeKey("codef-addr", address);
  const cached = apiCache.get<CodefAddressResult[]>(cacheKey);
  if (cached) return cached;

  const response = await codefRequest(PRODUCT_ADDRESS, {
    organization: "0002",
    inquiryType: "0",
    reqAddress: address,
  });

  const dataArr = Array.isArray(response.data) ? response.data : [response.data];

  const results: CodefAddressResult[] = dataArr
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      uniqueNo: String(item.uniqueNo || ""),
      address: String(item.address || item.commAddress || ""),
      realEstateType: String(item.realEstateType || item.commRealEstateType || ""),
      realEstateTypeCode: String(item.realEstateTypeCode || item.commRealEstateTypeCode || ""),
    }))
    .filter((r) => r.uniqueNo || r.address);

  apiCache.set(cacheKey, results, ADDRESS_CACHE_TTL);
  return results;
}

// ─── 등기부등본 조회 ───

/**
 * 등기부등본 열람 (텍스트 추출)
 *
 * CODEF 인터넷등기소 API (organization: "0002") 파라미터:
 * - inquiryType="1" + commUniqueNo + reqAddress → 고유번호+주소 기반 조회 (권장)
 *
 * @param params.reqAddress - 부동산 주소 (필수)
 * @param params.commUniqueNo - 부동산 고유번호 (등기부등본 상단 13자리, 필수)
 * @param params.realEstateType - 부동산 유형 코드 ("0": 토지, "1": 건물, "2": 집합건물)
 * @param params.registerType - 등기부 유형 ("0": 전체, "1": 갑구, "2": 을구)
 */
export async function fetchRegistry(params: {
  reqAddress: string;
  commUniqueNo: string;
  realEstateType?: string;
  registerType?: string;
}): Promise<CodefRegistryResult> {
  const { reqAddress, commUniqueNo, realEstateType = "2", registerType = "0" } = params;

  if (!reqAddress || !commUniqueNo) {
    throw new Error("부동산 주소와 고유번호가 모두 필요합니다.");
  }

  const cacheKey = APICache.makeKey("codef-reg", commUniqueNo, reqAddress, realEstateType, registerType);
  const cached = apiCache.get<CodefRegistryResult>(cacheKey);
  if (cached) return cached;

  const requestParams: Record<string, string> = {
    organization: "0002",
    inquiryType: "1",
    realEstateType,
    registerType,
    commUniqueNo,
    reqAddress,
  };

  const response = await codefRequest(PRODUCT_REGISTRY, requestParams);

  const data = Array.isArray(response.data) ? response.data[0] : response.data;

  // 등기부 데이터를 텍스트로 변환 (기존 파싱 엔진 호환)
  const text = extractRegistryText(data || {});

  const result: CodefRegistryResult = {
    text,
    registerType: String(data?.resRegisterType || registerType),
    uniqueNo: String(data?.resUniqueNo || commUniqueNo),
    address: String(data?.resAddress || reqAddress),
    rawData: (data || {}) as Record<string, unknown>,
  };

  apiCache.set(cacheKey, result, REGISTRY_CACHE_TTL);
  return result;
}

// ─── 등기부 데이터 → 텍스트 변환 ───

/**
 * CODEF 등기부 응답을 기존 registry-parser 호환 텍스트로 변환.
 * 파싱 엔진이 기대하는 포맷에 맞게 구조화된 텍스트 생성.
 */
function extractRegistryText(data: Record<string, unknown>): string {
  const lines: string[] = [];

  // 표제부
  lines.push("【 표 제 부 】");
  lines.push("");

  if (data.resAddress || data.commAddress) {
    lines.push(`소재지번: ${data.resAddress || data.commAddress}`);
  }
  if (data.resBuildingName) {
    lines.push(`건물명칭: ${data.resBuildingName}`);
  }
  if (data.resLandArea) {
    lines.push(`면적: ${data.resLandArea}`);
  }
  if (data.resBuildingArea) {
    lines.push(`건물면적: ${data.resBuildingArea}`);
  }
  if (data.resPurpose || data.resMainPurpose) {
    lines.push(`용도: ${data.resPurpose || data.resMainPurpose}`);
  }
  if (data.resStructure) {
    lines.push(`구조: ${data.resStructure}`);
  }

  // 전유부분
  if (data.resExclusivePart || data.resExclusiveArea) {
    lines.push("");
    lines.push("【 전유부분 】");
    if (data.resExclusivePart) lines.push(`전유부분: ${data.resExclusivePart}`);
    if (data.resExclusiveArea) lines.push(`전유면적: ${data.resExclusiveArea}㎡`);
  }

  // 갑구 (소유권)
  const gapguList = extractEntryList(data, "resGapgu", "resOwnership");
  if (gapguList.length > 0) {
    lines.push("");
    lines.push("【 갑 구 】 (소유권에 관한 사항)");
    lines.push("──────────────────────────────────");
    for (const entry of gapguList) {
      lines.push(formatRegistryEntry(entry));
    }
  }

  // 을구 (소유권 이외)
  const eulguList = extractEntryList(data, "resEulgu", "resOtherRights");
  if (eulguList.length > 0) {
    lines.push("");
    lines.push("【 을 구 】 (소유권 이외의 권리에 관한 사항)");
    lines.push("──────────────────────────────────");
    for (const entry of eulguList) {
      lines.push(formatRegistryEntry(entry));
    }
  }

  // 데이터가 비어있으면 원본 JSON 포함 (fallback)
  if (lines.length <= 3) {
    lines.push("");
    lines.push("─── 원본 데이터 ───");
    lines.push(JSON.stringify(data, null, 2));
  }

  return lines.join("\n");
}

function extractEntryList(
  data: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown>[] {
  for (const key of keys) {
    const val = data[key];
    if (Array.isArray(val)) return val as Record<string, unknown>[];
    if (val && typeof val === "object") return [val as Record<string, unknown>];
  }
  return [];
}

function formatRegistryEntry(entry: Record<string, unknown>): string {
  const parts: string[] = [];

  const rank = entry.resRankNo || entry.resNo || entry.rankNo || "";
  const purpose = entry.resPurpose || entry.resRegistrationPurpose || entry.purpose || "";
  const date = entry.resReceiptDate || entry.resDate || entry.receiptDate || "";
  const detail = entry.resDetail || entry.resContent || entry.detail || "";
  const holder = entry.resRightHolder || entry.resHolder || entry.rightHolder || "";
  const amount = entry.resAmount || entry.resBondAmount || entry.amount || "";
  const cancelled = entry.resCancelled || entry.cancelled || "";

  if (rank) parts.push(`[${rank}]`);
  if (date) parts.push(`접수일: ${date}`);
  if (purpose) parts.push(`목적: ${purpose}`);
  if (holder) parts.push(`권리자: ${holder}`);
  if (amount) parts.push(`금액: ${amount}`);
  if (detail) parts.push(`상세: ${detail}`);
  if (cancelled === "Y" || cancelled === "말소") parts.push("(말소)");

  return parts.join(" | ");
}

// ─── CODEF 사용 가능 여부 확인 ───

export function isCodefAvailable(): boolean {
  return !!(process.env.CODEF_DEMO_CLIENT_ID && process.env.CODEF_DEMO_CLIENT_SECRET);
}
