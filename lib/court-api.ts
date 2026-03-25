/**
 * VESTRA 대법원 판례 API 클라이언트
 * ──────────────────────────────────
 * 법제처 Open API(law.go.kr)를 통해 부동산 관련 판례를 검색.
 * 계약서 분석, AI 상담 시 실제 판례를 참조하여 정확도 향상.
 *
 * API 키: LAW_API_KEY 환경변수 (법제처 Open API 인증키)
 * 미설정 시 graceful fallback (빈 배열 반환).
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │ LAW_API_KEY 발급: https://open.law.go.kr/ → 오픈API →       │
 * │ 인증키 신청. .env.local에 LAW_API_KEY=발급받은키 추가        │
 * └──────────────────────────────────────────────────────────────┘
 */

import { apiCache, APICache } from "./api-cache";

/** 검색어 최대 길이 */
const MAX_QUERY_LENGTH = 100;

/**
 * 검색 결과 0건 시 키워드를 분리/확장하여 재검색 후보 생성
 * 예: "전세사기" → ["전세 사기", "임대차 보증금", "보증금 반환"]
 */
function generateRetryQueries(query: string): string[] {
  const retries: string[] = [];

  // 1) 붙어있는 단어를 띄어쓰기로 분리 (2글자+2글자 이상)
  if (query.length >= 4 && !query.includes(" ")) {
    for (let i = 2; i <= query.length - 2; i++) {
      retries.push(`${query.slice(0, i)} ${query.slice(i)}`);
    }
  }

  // 2) 부동산/임대차 맥락 키워드 추가
  const contextKeywords = ["임대차", "부동산", "보증금", "매매"];
  for (const kw of contextKeywords) {
    if (!query.includes(kw)) {
      retries.push(`${query} ${kw}`);
    }
  }

  return retries.slice(0, 5); // 최대 5개 재시도
}

export interface CourtCase {
  caseNumber: string;     // 사건번호
  caseName: string;       // 사건명
  courtName: string;      // 법원명
  judgmentDate: string;   // 선고일
  summary: string;        // 판시사항 요약
}

/** XML에서 태그 값 추출 */
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?\\s*</${tag}>`, "s");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

/**
 * 부동산 관련 판례 검색
 *
 * @param query - 검색 키워드 (예: "전세보증금 반환", "근저당 경매")
 * @param maxResults - 최대 결과 수 (기본 5)
 * @returns 판례 목록
 */
export async function searchCourtCases(
  query: string,
  maxResults: number = 5
): Promise<CourtCase[]> {
  const apiKey = process.env.LAW_API_KEY;
  if (!apiKey) return [];

  // 입력 검증: 길이 제한 + 특수문자 제거
  if (!query || typeof query !== "string") return [];
  const sanitizedQuery = query
    .replace(/[<>&"'\\]/g, "")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
  if (sanitizedQuery.length < 2) return [];

  // 캐시 확인 (판례 검색은 1시간 캐시)
  const cacheKey = APICache.makeKey("court", sanitizedQuery, maxResults);
  const cached = apiCache.get<CourtCase[]>(cacheKey);
  if (cached) return cached;

  // 1차 검색 시도
  const cases = await fetchCourtCasesRaw(apiKey, sanitizedQuery, maxResults);
  if (cases.length > 0) {
    apiCache.set(cacheKey, cases, 60 * 60 * 1000);
    return cases;
  }

  // 0건 시 키워드 분리/확장 재검색
  const retryQueries = generateRetryQueries(sanitizedQuery);
  for (const retryQ of retryQueries) {
    const retryCases = await fetchCourtCasesRaw(apiKey, retryQ, maxResults);
    if (retryCases.length > 0) {
      apiCache.set(cacheKey, retryCases, 60 * 60 * 1000);
      return retryCases;
    }
  }

  // 모든 재검색 실패 시 빈 배열 캐시 (불필요한 반복 방지)
  apiCache.set(cacheKey, [], 10 * 60 * 1000); // 10분
  return [];
}

/** 법제처 API 단건 호출 */
async function fetchCourtCasesRaw(apiKey: string, query: string, maxResults: number): Promise<CourtCase[]> {
  const baseUrl = "http://www.law.go.kr/DRF/lawSearch.do";
  const params = new URLSearchParams({
    OC: apiKey,
    target: "prec",
    type: "XML",
    query,
    display: String(maxResults),
    sort: "ddes",
  });

  try {
    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: { Accept: "application/xml" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    if (xml.length > 5 * 1024 * 1024) return [];

    const cases: CourtCase[] = [];
    const itemRegex = /<prec>([\s\S]*?)<\/prec>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && cases.length < maxResults) {
      const item = match[1];
      const caseName = extractTag(item, "사건명");
      if (!caseName) continue;
      cases.push({
        caseNumber: extractTag(item, "사건번호"),
        caseName,
        courtName: extractTag(item, "법원명"),
        judgmentDate: extractTag(item, "선고일자"),
        summary: extractTag(item, "판시사항").slice(0, 300),
      });
    }
    return cases;
  } catch {
    return [];
  }
}

/**
 * 계약 분석용 관련 판례 검색
 *
 * 계약서 텍스트에서 핵심 키워드를 추출하여 관련 판례를 검색.
 */
export async function searchRelatedCases(
  contractKeywords: string[]
): Promise<CourtCase[]> {
  if (contractKeywords.length === 0) return [];

  // 최대 3개 키워드로 병렬 검색
  const queries = contractKeywords.slice(0, 3);
  const promises = queries.map((q) => searchCourtCases(q, 3));
  const results = await Promise.all(promises);

  // 중복 제거 (사건번호 기준)
  const seen = new Set<string>();
  const unique: CourtCase[] = [];
  for (const c of results.flat()) {
    if (!seen.has(c.caseNumber)) {
      seen.add(c.caseNumber);
      unique.push(c);
    }
  }

  return unique.slice(0, 5);
}
