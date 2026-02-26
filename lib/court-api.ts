/**
 * VESTRA 대법원 판례 API 클라이언트
 * ──────────────────────────────────
 * 법제처 Open API(law.go.kr)를 통해 부동산 관련 판례를 검색.
 * 계약서 분석, AI 상담 시 실제 판례를 참조하여 정확도 향상.
 *
 * API 키: LAW_API_KEY 환경변수 (법제처 Open API 인증키)
 * 미설정 시 graceful fallback (빈 배열 반환).
 */

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

  const baseUrl = "http://www.law.go.kr/DRF/lawSearch.do";

  const params = new URLSearchParams({
    OC: apiKey,
    target: "prec",
    type: "XML",
    query,
    display: String(maxResults),
    sort: "ddes",  // 최신순
  });

  try {
    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: { Accept: "application/xml" },
    });
    if (!res.ok) {
      console.warn(`Court API error: ${res.status}`);
      return [];
    }

    const xml = await res.text();
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
  } catch (error) {
    console.warn("Court API fetch error:", error);
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
