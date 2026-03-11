/**
 * Scholar(학술논문) 검색 라이브러리
 * ─────────────────────────────────
 * Semantic Scholar, RISS, KCI API를 통합 검색.
 * 설정된 API 키가 있는 소스만 병렬로 호출하고 결과를 병합한다.
 */

import { getScholarSettings, SCHOLAR_PROVIDERS } from "./system-settings";

// ─── 타입 ───

export interface ScholarPaper {
  title: string;
  authors: string[];
  year: number | null;
  abstract: string;
  url: string;
  source: "semantic_scholar" | "riss" | "kci";
  citationCount?: number;
  journal?: string;
  doi?: string;
}

// ─── Semantic Scholar ───

async function searchSemanticScholar(
  query: string,
  apiKey?: string,
): Promise<ScholarPaper[]> {
  const params = new URLSearchParams({
    query,
    limit: "5",
    fields: "title,authors,year,abstract,url,citationCount,journal,externalIds",
  });
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?${params}`;
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];

  const json = await res.json();
  const papers: ScholarPaper[] = (json.data || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => ({
      title: p.title || "",
      authors: (p.authors || []).map((a: { name: string }) => a.name),
      year: p.year ?? null,
      abstract: p.abstract || "",
      url: p.url || (p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : ""),
      source: "semantic_scholar" as const,
      citationCount: p.citationCount ?? undefined,
      journal: p.journal?.name || undefined,
      doi: p.externalIds?.DOI || undefined,
    }),
  );
  return papers;
}

// ─── RISS ───

async function searchRISS(
  query: string,
  apiKey: string,
): Promise<ScholarPaper[]> {
  const params = new URLSearchParams({
    query,
    apiKey,
    displayCount: "5",
  });
  const url = `http://openapi.riss.kr/openapi/search/thesis?${params}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];

  const text = await res.text();
  // RISS는 XML로 응답 — 간단하게 정규식으로 파싱
  const items = text.split("<item>").slice(1);
  return items.map((item) => {
    const extract = (tag: string) => {
      const match = item.match(new RegExp(`<${tag}><!\\[CDATA\\[(.+?)\\]\\]></${tag}>|<${tag}>(.+?)</${tag}>`));
      return match ? (match[1] || match[2] || "").trim() : "";
    };
    return {
      title: extract("title"),
      authors: extract("creator") ? [extract("creator")] : [],
      year: extract("date") ? parseInt(extract("date").slice(0, 4), 10) || null : null,
      abstract: extract("abstract"),
      url: extract("url") || extract("link"),
      source: "riss" as const,
      journal: extract("publisher") || undefined,
    };
  }).filter((p) => p.title);
}

// ─── KCI ───

async function searchKCI(
  query: string,
  apiKey: string,
): Promise<ScholarPaper[]> {
  const params = new URLSearchParams({
    key: apiKey,
    title: query,
    displayCount: "5",
  });
  const url = `https://open.kci.go.kr/po/openapi/openApiSearch.kci?${params}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];

  const text = await res.text();
  const records = text.split("<record>").slice(1);
  return records.map((record) => {
    const extract = (tag: string) => {
      const match = record.match(new RegExp(`<${tag}><!\\[CDATA\\[(.+?)\\]\\]></${tag}>|<${tag}>(.+?)</${tag}>`));
      return match ? (match[1] || match[2] || "").trim() : "";
    };
    return {
      title: extract("TITLE") || extract("title"),
      authors: extract("AUTHOR") ? extract("AUTHOR").split(";").map((a) => a.trim()) : [],
      year: extract("PUB_YEAR") ? parseInt(extract("PUB_YEAR"), 10) || null : null,
      abstract: extract("ABSTRACT") || extract("abstract"),
      url: extract("URL") || extract("url"),
      source: "kci" as const,
      journal: extract("JOURNAL_NAME") || undefined,
      doi: extract("DOI") || undefined,
    };
  }).filter((p) => p.title);
}

// ─── 통합 검색 ───

/**
 * 설정된 Scholar API 키를 기반으로 병렬 검색 수행.
 * API 키가 없는 소스는 건너뜀 (Semantic Scholar는 키 없이도 무료 사용 가능).
 */
export async function searchScholarPapers(query: string): Promise<{
  papers: ScholarPaper[];
  sources: string[];
}> {
  const settings = await getScholarSettings();
  const tasks: Promise<ScholarPaper[]>[] = [];
  const activeSources: string[] = [];

  // Semantic Scholar: API 키 없이도 호출 가능 (rate limit 더 낮음)
  const semanticKey = settings[SCHOLAR_PROVIDERS[0].apiKeyName];
  tasks.push(searchSemanticScholar(query, semanticKey || undefined).catch(() => []));
  activeSources.push("Semantic Scholar");

  // RISS: API 키 필수
  const rissKey = settings[SCHOLAR_PROVIDERS[1].apiKeyName];
  if (rissKey) {
    tasks.push(searchRISS(query, rissKey).catch(() => []));
    activeSources.push("RISS");
  }

  // KCI: API 키 필수
  const kciKey = settings[SCHOLAR_PROVIDERS[2].apiKeyName];
  if (kciKey) {
    tasks.push(searchKCI(query, kciKey).catch(() => []));
    activeSources.push("KCI");
  }

  const results = await Promise.all(tasks);
  const allPapers = results.flat();

  // 중복 제거 (DOI 또는 제목 기준)
  const seen = new Set<string>();
  const unique = allPapers.filter((p) => {
    const key = p.doi || p.title.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // citationCount 내림차순 정렬 (없는 건 뒤로)
  unique.sort((a, b) => (b.citationCount ?? -1) - (a.citationCount ?? -1));

  return { papers: unique.slice(0, 10), sources: activeSources };
}
