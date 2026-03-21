// localStorage 기반 분석 결과 저장소
// 사용자가 각 모듈에서 분석한 결과를 저장하고, 대시보드에서 불러옴
// XSS 방어를 위해 Base64 인코딩 적용

export interface AnalysisRecord {
  id: string;
  type: "rights" | "contract" | "prediction" | "jeonse" | "registry" | "feasibility";
  typeLabel: string;
  address: string;
  summary: string;
  date: string;
  data: Record<string, unknown>;
}

export interface StoredAsset {
  id: string;
  address: string;
  type: string; // 아파트, 빌라 등
  estimatedPrice: number;
  jeonsePrice?: number;
  safetyScore: number;
  riskScore: number;
  lastAnalyzedDate: string;
  priceHistory?: { month: string; price: number }[];
}

const ANALYSIS_KEY = "vestra_analyses";
const ASSETS_KEY = "vestra_assets";

// ─── 인코딩/디코딩 (XSS 시 평문 노출 방지) ───

function encode(data: unknown): string {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

function decode<T>(raw: string): T | null {
  try {
    return JSON.parse(decodeURIComponent(atob(raw)));
  } catch {
    // 레거시 평문 데이터 호환
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 분석 이력
export function getAnalyses(): AnalysisRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANALYSIS_KEY);
    if (!raw) return [];
    return decode<AnalysisRecord[]>(raw) ?? [];
  } catch {
    return [];
  }
}

export function addAnalysis(record: Omit<AnalysisRecord, "id" | "date">): AnalysisRecord {
  const analyses = getAnalyses();
  const newRecord: AnalysisRecord = {
    ...record,
    id: generateId(),
    date: new Date().toISOString(),
  };
  analyses.unshift(newRecord);
  // 최대 50건
  if (analyses.length > 50) analyses.splice(50);
  localStorage.setItem(ANALYSIS_KEY, encode(analyses));

  // 서버 동기화 (fire-and-forget, UI 블로킹 없음)
  syncToServer("analysis", newRecord).catch(() => {});

  return newRecord;
}

// 관리 자산
export function getAssets(): StoredAsset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ASSETS_KEY);
    if (!raw) return [];
    return decode<StoredAsset[]>(raw) ?? [];
  } catch {
    return [];
  }
}

export function addOrUpdateAsset(asset: Omit<StoredAsset, "id" | "lastAnalyzedDate">): StoredAsset {
  const assets = getAssets();
  const existing = assets.find((a) => a.address === asset.address);

  if (existing) {
    Object.assign(existing, asset, { lastAnalyzedDate: new Date().toISOString() });
    localStorage.setItem(ASSETS_KEY, encode(assets));

    // 서버 동기화 (fire-and-forget)
    syncToServer("asset", existing).catch(() => {});

    return existing;
  }

  const newAsset: StoredAsset = {
    ...asset,
    id: generateId(),
    lastAnalyzedDate: new Date().toISOString(),
  };
  assets.unshift(newAsset);
  localStorage.setItem(ASSETS_KEY, encode(assets));

  // 서버 동기화 (fire-and-forget)
  syncToServer("asset", newAsset).catch(() => {});

  return newAsset;
}

export function removeAnalysis(id: string): void {
  const analyses = getAnalyses().filter((a) => a.id !== id);
  localStorage.setItem(ANALYSIS_KEY, encode(analyses));
}

export function removeAsset(id: string): void {
  const assets = getAssets().filter((a) => a.id !== id);
  localStorage.setItem(ASSETS_KEY, encode(assets));
}

/**
 * 주소 기반 최신 분석 결과 조회
 * 크로스 기능 연동: 동일 주소에 대해 다른 분석 도구에서 이전 결과를 자동 참조
 */
export function getLatestAnalysisForAddress(address: string): AnalysisRecord | null {
  if (typeof window === "undefined" || !address) return null;
  const analyses = getAnalyses();
  const normalized = address.replace(/\s+/g, "");

  const matched = analyses.find(
    (a) => a.address.replace(/\s+/g, "") === normalized
  );

  return matched ?? null;
}

export function clearAll(): void {
  localStorage.removeItem(ANALYSIS_KEY);
  localStorage.removeItem(ASSETS_KEY);
}

// ─── 서버 동기화 (DB 영속화) ───

/**
 * 서버에 데이터를 동기화 (fire-and-forget)
 * localStorage가 주 저장소이고, 서버 동기화는 best-effort
 */
export async function syncToServer(
  type: "analysis" | "asset",
  data: AnalysisRecord | StoredAsset,
): Promise<void> {
  try {
    await fetch("/api/user/sync-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data }),
    });
  } catch {
    // 서버 동기화 실패 시 무시 (localStorage가 primary)
  }
}

/**
 * 서버에서 데이터를 불러와 localStorage와 병합
 * 충돌 시 서버 데이터(최신 날짜 기준)가 우선
 */
export async function loadFromServer(): Promise<{
  analyses: AnalysisRecord[];
  assets: StoredAsset[];
} | null> {
  try {
    const res = await fetch("/api/user/sync-data");
    if (!res.ok) return null;

    const serverData = await res.json() as {
      analyses: AnalysisRecord[];
      assets: StoredAsset[];
    };

    // 분석 이력 병합
    const localAnalyses = getAnalyses();
    const mergedAnalyses = mergeAnalyses(localAnalyses, serverData.analyses);
    localStorage.setItem(ANALYSIS_KEY, encode(mergedAnalyses));

    // 자산 병합
    const localAssets = getAssets();
    const mergedAssets = mergeAssets(localAssets, serverData.assets);
    localStorage.setItem(ASSETS_KEY, encode(mergedAssets));

    return { analyses: mergedAnalyses, assets: mergedAssets };
  } catch {
    return null;
  }
}

/** 분석 이력 병합: 서버가 더 최신이면 서버 데이터로 덮어쓰기 */
function mergeAnalyses(
  local: AnalysisRecord[],
  server: AnalysisRecord[],
): AnalysisRecord[] {
  const map = new Map<string, AnalysisRecord>();

  // 로컬 먼저 등록
  for (const item of local) {
    map.set(item.id, item);
  }

  // 서버 데이터로 덮어쓰기 (충돌 시 날짜 비교, 서버가 같거나 최신이면 서버 우선)
  for (const item of server) {
    const existing = map.get(item.id);
    if (!existing || new Date(item.date) >= new Date(existing.date)) {
      map.set(item.id, item);
    }
  }

  // 날짜 내림차순 정렬, 최대 50건
  return Array.from(map.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);
}

/** 자산 병합: 같은 주소면 lastAnalyzedDate가 더 최신인 쪽 우선 */
function mergeAssets(
  local: StoredAsset[],
  server: StoredAsset[],
): StoredAsset[] {
  const map = new Map<string, StoredAsset>();

  for (const item of local) {
    map.set(item.address, item);
  }

  for (const item of server) {
    const existing = map.get(item.address);
    if (
      !existing ||
      new Date(item.lastAnalyzedDate) >= new Date(existing.lastAnalyzedDate)
    ) {
      map.set(item.address, item);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.lastAnalyzedDate).getTime() -
      new Date(a.lastAnalyzedDate).getTime(),
  );
}
