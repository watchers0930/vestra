/**
 * 권리관계 그래프 — 공용 타입·상수·빌더 (표시 전용)
 *
 * RightsGraphView / RightsGraphNode / RightsGraphLegend / RightsRiskIndexPanel이 공유.
 * 서버 엔진(lib/rights-graph-engine) 결과를 재구현하지 않는다 — 노드/체인 구성은
 * 화면 표시용 보조 구성이며, 종합 위험도는 ①의 공용 안전/위험점수에서만 파생한다(설계 §4.8).
 */
import type { ParsedRegistry } from "@/lib/registry-parser";

export interface GraphNode {
  id: string;
  label: string;
  type: "property" | "ownership" | "mortgage" | "lease" | "seizure" | "trust" | "other";
  amount: number;
  riskWeight: number;
  isCancelled?: boolean;
  /** 접수일(파서 원문값) — 근거 열람용. 없으면 미표시 */
  date?: string;
  /** 등기 순위(갑/을구 순위번호). 실제 배당순위 확정값 아님 */
  order?: number;
  /** 부기등기 하위 순위 (예: 1-1 → subOrder 1) */
  subOrder?: number;
  /** 등기 원문 요약(detail) — 근거 열람용 */
  detail?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  weight: number;
}

export interface RiskChain {
  path: string[];
  totalRisk: number;
  level: "critical" | "high" | "medium" | "low";
}

export interface GraphAnalysisProp {
  graph: { nodeCount: number; edgeCount: number; maxDepth: number };
  cycles: { hasCycle: boolean; cycles: Array<{ path: string[]; riskScore: number; description: string }> };
  riskPropagation: {
    nodeRisks: Record<string, number>;
    propagationSteps: Array<{ from: string; to: string; riskDelta: number; iteration: number }>;
    convergenceIterations: number;
    totalSystemRisk: number;
  };
  chainAnalysis: { chains: Array<{ id: string; nodes: string[]; totalAmount: number; riskLevel: string; description: string }>; longestChain: number; maxChainAmount: number };
  criticalPath: { path: string[]; totalRisk: number; maxLossAmount: number; description: string };
  clusterAnalysis: { clusters: Array<{ id: number; nodes: string[]; internalRisk: number; connectedTo: number[] }>; isolatedNodes: string[] };
}

/** 노드 종류별 색상 — 색상 외 라벨(NODE_TYPE_LABELS)로도 구분한다 */
export const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  property: { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-800" },
  ownership: { bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-800" },
  mortgage: { bg: "bg-red-100", border: "border-red-400", text: "text-red-800" },
  lease: { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-800" },
  seizure: { bg: "bg-purple-100", border: "border-purple-400", text: "text-purple-800" },
  trust: { bg: "bg-indigo-100", border: "border-indigo-400", text: "text-indigo-800" },
  other: { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-800" },
};

export const NODE_TYPE_LABELS: Record<string, string> = {
  property: "부동산",
  ownership: "소유권",
  mortgage: "근저당",
  lease: "전세/임차",
  seizure: "압류/가처분",
  trust: "신탁",
  other: "기타",
};

export function getNodeType(purpose: string): GraphNode["type"] {
  if (/소유권/.test(purpose)) return "ownership";
  if (/근저당|저당/.test(purpose)) return "mortgage";
  if (/전세|임차/.test(purpose)) return "lease";
  if (/가압류|압류|가처분|경매/.test(purpose)) return "seizure";
  if (/신탁/.test(purpose)) return "trust";
  return "other";
}

export function getRiskWeight(type: GraphNode["type"]): number {
  const weights: Record<string, number> = {
    seizure: 0.95, mortgage: 0.7, trust: 0.6,
    lease: 0.4, ownership: 0.1, property: 0, other: 0.3,
  };
  return weights[type] ?? 0.3;
}

/** 등기부에서 표시용 노드·위험 체인을 구성한다(순수 함수). */
export function buildGraph(parsed: ParsedRegistry): { nodes: GraphNode[]; chains: RiskChain[] } {
  const nodes: GraphNode[] = [];

  const propertyLabel = parsed.title?.address || "대상 부동산";
  nodes.push({
    id: "property",
    label: propertyLabel.length > 20 ? propertyLabel.slice(0, 20) + "…" : propertyLabel,
    type: "property",
    amount: 0,
    riskWeight: 0,
  });

  // 부기등기(isSupplementary)는 주등기의 순위를 승계하는 변경/이전/말소 기록이다.
  // 독립 채권 노드로 만들면 같은 권리가 유효 권리 수·금액·위험 경로에 중복 집계된다(설계 §4.8).
  // 서버 산식(claims-policy)과 동일하게 부기는 독립 노드에서 제외한다.
  parsed.gapgu?.forEach((entry, i) => {
    if (entry.isSupplementary) return;
    const type = getNodeType(entry.purpose);
    nodes.push({
      id: `gapgu_${i}`,
      label: `${entry.purpose}\n${entry.holder}`,
      type,
      amount: 0,
      riskWeight: getRiskWeight(type),
      isCancelled: entry.isCancelled,
      date: entry.date || undefined,
      order: entry.order,
      subOrder: entry.subOrder,
      detail: entry.detail || undefined,
    });
  });

  parsed.eulgu?.forEach((entry, i) => {
    if (entry.isSupplementary) return;
    const type = getNodeType(entry.purpose);
    nodes.push({
      id: `eulgu_${i}`,
      label: `${entry.purpose}\n${entry.holder}`,
      type,
      amount: entry.amount || 0,
      riskWeight: getRiskWeight(type),
      isCancelled: entry.isCancelled,
      date: entry.date || undefined,
      order: entry.order,
      subOrder: entry.subOrder,
      detail: entry.detail || undefined,
    });
  });

  const chains: RiskChain[] = [];
  const activeNodes = nodes.filter((n) => !n.isCancelled && n.id !== "property");
  const highRiskNodes = activeNodes.filter((n) => n.riskWeight >= 0.7);

  if (highRiskNodes.length >= 2) {
    chains.push({
      path: ["property", ...highRiskNodes.map((n) => n.id)],
      totalRisk: highRiskNodes.reduce((s, n) => s + n.riskWeight, 0) / highRiskNodes.length,
      level: "critical",
    });
  } else if (highRiskNodes.length === 1) {
    chains.push({
      path: ["property", highRiskNodes[0].id],
      totalRisk: highRiskNodes[0].riskWeight,
      level: "high",
    });
  }

  return { nodes, chains };
}
