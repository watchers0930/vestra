// localStorage 기반 분석 결과 저장소
// 사용자가 각 모듈에서 분석한 결과를 저장하고, 대시보드에서 불러옴

export interface AnalysisRecord {
  id: string;
  type: "rights" | "contract" | "prediction" | "jeonse" | "registry";
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

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 분석 이력
export function getAnalyses(): AnalysisRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANALYSIS_KEY);
    return raw ? JSON.parse(raw) : [];
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
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(analyses));
  return newRecord;
}

// 관리 자산
export function getAssets(): StoredAsset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ASSETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addOrUpdateAsset(asset: Omit<StoredAsset, "id" | "lastAnalyzedDate">): StoredAsset {
  const assets = getAssets();
  const existing = assets.find((a) => a.address === asset.address);

  if (existing) {
    Object.assign(existing, asset, { lastAnalyzedDate: new Date().toISOString() });
    localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
    return existing;
  }

  const newAsset: StoredAsset = {
    ...asset,
    id: generateId(),
    lastAnalyzedDate: new Date().toISOString(),
  };
  assets.unshift(newAsset);
  localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
  return newAsset;
}

export function removeAnalysis(id: string): void {
  const analyses = getAnalyses().filter((a) => a.id !== id);
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(analyses));
}

export function removeAsset(id: string): void {
  const assets = getAssets().filter((a) => a.id !== id);
  localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
}

export function clearAll(): void {
  localStorage.removeItem(ANALYSIS_KEY);
  localStorage.removeItem(ASSETS_KEY);
}
