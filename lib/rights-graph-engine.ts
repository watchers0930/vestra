/**
 * VESTRA 그래프 기반 권리관계 분석 엔진
 * ────────────────────────────────────────────
 * 특허 핵심: 등기부등본의 권리관계를 방향 가중 그래프로 모델링.
 * 순환 탐지, 위험 전파 알고리즘, 체인 분석, 최대 피해 경로 산출.
 *
 * 순수 TypeScript 구현. 외부 그래프 라이브러리 없음.
 * 알고리즘 ID: VESTRA-RIGHTS-GRAPH-v1.0.0
 */

import type { ParsedRegistry } from "./registry-parser";
import {
  detectCycles, propagateRisk, analyzeChains,
  findCriticalPath, analyzeCluster, formatAmount,
} from "./rights/graph-analyzers";

// ─── re-export (기존 import 경로 유지) ───

export {
  detectCycles, propagateRisk, analyzeChains,
  findCriticalPath, analyzeCluster, formatAmount,
} from "./rights/graph-analyzers";

// ─── 그래프 자료구조 ───

export interface GraphNode {
  id: string;
  type: "property" | "mortgage" | "seizure" | "lease" | "trust" | "owner" | "creditor";
  label: string;
  amount: number;
  date: string;
  priority: number;
  riskWeight: number;
  metadata: Record<string, string | number | boolean>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "claim" | "ownership" | "subordination" | "conflict" | "dependency";
  weight: number;
  label: string;
}

export interface RightsGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  adjacency: Map<string, GraphEdge[]>;
  reverseAdj: Map<string, GraphEdge[]>;
}

// ─── 분석 결과 타입 ───

export interface GraphAnalysisResult {
  graph: {
    nodeCount: number;
    edgeCount: number;
    maxDepth: number;
  };
  cycles: CycleDetectionResult;
  riskPropagation: RiskPropagationResult;
  chainAnalysis: ChainAnalysisResult;
  criticalPath: CriticalPathResult;
  clusterAnalysis: ClusterResult;
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  cycles: Array<{
    path: string[];
    riskScore: number;
    description: string;
  }>;
}

export interface RiskPropagationResult {
  nodeRisks: Map<string, number>;
  propagationSteps: Array<{
    from: string;
    to: string;
    riskDelta: number;
    iteration: number;
  }>;
  convergenceIterations: number;
  totalSystemRisk: number;
}

export interface ChainAnalysisResult {
  chains: Array<{
    id: string;
    nodes: string[];
    totalAmount: number;
    riskLevel: "critical" | "high" | "medium" | "low";
    description: string;
  }>;
  longestChain: number;
  maxChainAmount: number;
}

export interface CriticalPathResult {
  path: string[];
  totalRisk: number;
  maxLossAmount: number;
  description: string;
}

export interface ClusterResult {
  clusters: Array<{
    id: number;
    nodes: string[];
    internalRisk: number;
    connectedTo: number[];
  }>;
  isolatedNodes: string[];
}

// ─── 유틸리티 ───

function getNodeType(purpose: string): GraphNode["type"] {
  if (/소유권/.test(purpose)) return "owner";
  if (/근저당|저당/.test(purpose)) return "mortgage";
  if (/압류|가압류/.test(purpose)) return "seizure";
  if (/전세|임차/.test(purpose)) return "lease";
  if (/신탁/.test(purpose)) return "trust";
  return "creditor";
}

function getBaseRiskWeight(type: GraphNode["type"]): number {
  switch (type) {
    case "seizure": return 0.9;
    case "mortgage": return 0.5;
    case "lease": return 0.3;
    case "trust": return 0.6;
    case "creditor": return 0.4;
    case "owner": return 0.1;
    case "property": return 0;
    default: return 0.3;
  }
}

function calculateMaxDepth(graph: RightsGraph): number {
  function dfs(nodeId: string, depth: number, visited: Set<string>): number {
    if (visited.has(nodeId)) return depth;
    visited.add(nodeId);

    let maxDepth = depth;
    const neighbors = graph.adjacency.get(nodeId) || [];
    for (const edge of neighbors) {
      maxDepth = Math.max(maxDepth, dfs(edge.target, depth + 1, visited));
    }
    visited.delete(nodeId);
    return maxDepth;
  }

  return dfs("property_root", 0, new Set());
}

// ─── 그래프 구축 ───

export function buildRightsGraph(
  parsed: ParsedRegistry,
  estimatedPrice: number = 0,
): RightsGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const propertyId = "property_root";
  nodes.set(propertyId, {
    id: propertyId,
    type: "property",
    label: parsed.title?.address || "대상 부동산",
    amount: estimatedPrice,
    date: "",
    priority: 0,
    riskWeight: 0,
    metadata: { estimatedPrice },
  });

  for (const entry of parsed.gapgu) {
    if (entry.isCancelled) continue;

    const nodeId = `gapgu_${entry.order}`;
    const type = getNodeType(entry.purpose);
    const riskWeight = getBaseRiskWeight(type);

    nodes.set(nodeId, {
      id: nodeId,
      type,
      label: `${entry.purpose} (${entry.holder})`,
      amount: 0,
      date: entry.date,
      priority: entry.order,
      riskWeight,
      metadata: {
        purpose: entry.purpose,
        holder: entry.holder,
        isCancelled: entry.isCancelled,
      },
    });

    edges.push({
      id: `edge_prop_${nodeId}`,
      source: propertyId,
      target: nodeId,
      type: type === "owner" ? "ownership" : "claim",
      weight: riskWeight,
      label: entry.purpose,
    });
  }

  for (const entry of parsed.eulgu) {
    if (entry.isCancelled) continue;

    const nodeId = `eulgu_${entry.order}`;
    const type = getNodeType(entry.purpose);
    const riskWeight = getBaseRiskWeight(type);

    nodes.set(nodeId, {
      id: nodeId,
      type,
      label: `${entry.purpose} (${entry.holder}, ${formatAmount(entry.amount)})`,
      amount: entry.amount || 0,
      date: entry.date,
      priority: entry.order,
      riskWeight,
      metadata: {
        purpose: entry.purpose,
        holder: entry.holder,
        amount: entry.amount,
      },
    });

    edges.push({
      id: `edge_prop_${nodeId}`,
      source: propertyId,
      target: nodeId,
      type: "claim",
      weight: riskWeight * (entry.amount / Math.max(estimatedPrice, 1)),
      label: entry.purpose,
    });
  }

  const allEntries = [
    ...parsed.gapgu.filter((e) => !e.isCancelled).map((e) => ({ ...e, section: "gapgu" })),
    ...parsed.eulgu.filter((e) => !e.isCancelled).map((e) => ({ ...e, section: "eulgu" })),
  ].sort((a, b) => {
    const dateA = a.date?.replace(/\./g, "") || "0";
    const dateB = b.date?.replace(/\./g, "") || "0";
    return dateA.localeCompare(dateB);
  });

  for (let i = 0; i < allEntries.length - 1; i++) {
    const current = allEntries[i];
    const next = allEntries[i + 1];
    const sourceId = `${current.section}_${current.order}`;
    const targetId = `${next.section}_${next.order}`;

    if (nodes.has(sourceId) && nodes.has(targetId)) {
      edges.push({
        id: `edge_sub_${sourceId}_${targetId}`,
        source: sourceId,
        target: targetId,
        type: "subordination",
        weight: 0.5,
        label: "후순위",
      });
    }
  }

  const conflictPairs: Array<[string, string]> = [];
  const seizureNodes = [...nodes.entries()].filter(([, n]) => n.type === "seizure");
  const mortgageNodes = [...nodes.entries()].filter(([, n]) => n.type === "mortgage");
  const leaseNodes = [...nodes.entries()].filter(([, n]) => n.type === "lease");

  for (const [seizureId] of seizureNodes) {
    for (const [mortgageId] of mortgageNodes) {
      conflictPairs.push([seizureId, mortgageId]);
    }
    for (const [leaseId] of leaseNodes) {
      conflictPairs.push([seizureId, leaseId]);
    }
  }

  for (const [sourceId, targetId] of conflictPairs) {
    edges.push({
      id: `edge_conflict_${sourceId}_${targetId}`,
      source: sourceId,
      target: targetId,
      type: "conflict",
      weight: 0.8,
      label: "권리 충돌",
    });
  }

  const adjacency = new Map<string, GraphEdge[]>();
  const reverseAdj = new Map<string, GraphEdge[]>();

  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge);

    if (!reverseAdj.has(edge.target)) reverseAdj.set(edge.target, []);
    reverseAdj.get(edge.target)!.push(edge);
  }

  return { nodes, edges, adjacency, reverseAdj };
}

// ─── 메인 분석 함수 ───

export function analyzeRightsGraph(
  parsed: ParsedRegistry,
  estimatedPrice: number = 0,
): GraphAnalysisResult {
  const graph = buildRightsGraph(parsed, estimatedPrice);
  const cycles = detectCycles(graph);
  const riskPropagation = propagateRisk(graph);
  const chainAnalysis = analyzeChains(graph);
  const criticalPath = findCriticalPath(graph, estimatedPrice);
  const clusterAnalysis = analyzeCluster(graph);
  const maxDepth = calculateMaxDepth(graph);

  return {
    graph: {
      nodeCount: graph.nodes.size,
      edgeCount: graph.edges.length,
      maxDepth,
    },
    cycles,
    riskPropagation,
    chainAnalysis,
    criticalPath,
    clusterAnalysis,
  };
}
