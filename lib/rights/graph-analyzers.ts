/**
 * 권리관계 그래프 분석 알고리즘
 *
 * 순환 탐지(DFS), 위험 전파(PageRank 변형), 체인 분석,
 * 최대 위험 경로(Dijkstra 변형), 클러스터 분석(BFS)
 *
 * @module lib/rights/graph-analyzers
 */

import type {
  RightsGraph, CycleDetectionResult, RiskPropagationResult,
  ChainAnalysisResult, CriticalPathResult, ClusterResult,
} from "../rights-graph-engine";

// ─── 유틸리티 ───

export function formatAmount(amount: number): string {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억원`;
  if (amount >= 10_000) return `${(amount / 10_000).toFixed(0)}만원`;
  return `${amount}원`;
}

// ─── 순환 탐지 (DFS 기반) ───

export function detectCycles(graph: RightsGraph): CycleDetectionResult {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: CycleDetectionResult["cycles"] = [];

  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.adjacency.get(nodeId) || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.target)) {
        dfs(edge.target, [...path]);
      } else if (recursionStack.has(edge.target)) {
        const cycleStart = path.indexOf(edge.target);
        const cyclePath = [...path.slice(cycleStart), edge.target];
        const riskScore = calculateCycleRisk(graph, cyclePath);

        cycles.push({
          path: cyclePath,
          riskScore,
          description: describeCycle(graph, cyclePath),
        });
      }
    }

    recursionStack.delete(nodeId);
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }

  return { hasCycle: cycles.length > 0, cycles };
}

function calculateCycleRisk(graph: RightsGraph, cyclePath: string[]): number {
  let totalRisk = 0;
  for (const nodeId of cyclePath) {
    const node = graph.nodes.get(nodeId);
    if (node) totalRisk += node.riskWeight;
  }
  return Math.min(100, totalRisk * 20);
}

function describeCycle(graph: RightsGraph, cyclePath: string[]): string {
  const labels = cyclePath
    .map((id) => graph.nodes.get(id)?.label || id)
    .slice(0, -1);
  return `순환적 권리관계 발견: ${labels.join(" → ")} → (순환)`;
}

// ─── 위험 전파 알고리즘 (PageRank 변형) ───

export function propagateRisk(
  graph: RightsGraph,
  dampingFactor: number = 0.85,
  maxIterations: number = 100,
  convergenceThreshold: number = 0.001,
): RiskPropagationResult {
  const N = graph.nodes.size;
  if (N === 0) {
    return {
      nodeRisks: new Map(),
      propagationSteps: [],
      convergenceIterations: 0,
      totalSystemRisk: 0,
    };
  }

  const risks = new Map<string, number>();
  for (const [id, node] of graph.nodes) {
    risks.set(id, node.riskWeight);
  }

  const propagationSteps: RiskPropagationResult["propagationSteps"] = [];
  let converged = false;
  let iteration = 0;

  while (!converged && iteration < maxIterations) {
    const newRisks = new Map<string, number>();
    let maxDelta = 0;

    for (const [nodeId, node] of graph.nodes) {
      let newRisk = (1 - dampingFactor) * node.riskWeight;

      const incomingEdges = graph.reverseAdj.get(nodeId) || [];
      for (const edge of incomingEdges) {
        const sourceRisk = risks.get(edge.source) || 0;
        const outEdges = graph.adjacency.get(edge.source) || [];
        const totalOutWeight = outEdges.reduce((sum, e) => sum + e.weight, 0) || 1;

        const propagatedRisk = dampingFactor * sourceRisk * edge.weight / totalOutWeight;
        newRisk += propagatedRisk;

        if (propagatedRisk > 0.01) {
          propagationSteps.push({
            from: edge.source,
            to: nodeId,
            riskDelta: Math.round(propagatedRisk * 1000) / 1000,
            iteration,
          });
        }
      }

      newRisks.set(nodeId, Math.min(1, newRisk));
      maxDelta = Math.max(maxDelta, Math.abs(newRisk - (risks.get(nodeId) || 0)));
    }

    if (maxDelta < convergenceThreshold) converged = true;

    for (const [id, risk] of newRisks) {
      risks.set(id, risk);
    }
    iteration++;
  }

  let totalRisk = 0;
  for (const risk of risks.values()) {
    totalRisk += risk;
  }
  const totalSystemRisk = Math.min(100, Math.round((totalRisk / N) * 100));

  return {
    nodeRisks: risks,
    propagationSteps,
    convergenceIterations: iteration,
    totalSystemRisk,
  };
}

// ─── 체인 분석 ───

export function analyzeChains(graph: RightsGraph): ChainAnalysisResult {
  const chains: ChainAnalysisResult["chains"] = [];
  let chainId = 0;

  function extractChain(startId: string, path: string[], totalAmount: number): void {
    path.push(startId);
    const node = graph.nodes.get(startId);
    const nodeAmount = node?.amount || 0;
    totalAmount += nodeAmount;

    const outEdges = graph.adjacency.get(startId) || [];
    const unvisitedEdges = outEdges.filter((e) =>
      !path.includes(e.target) && e.type !== "conflict"
    );

    if (unvisitedEdges.length === 0 && path.length > 1) {
      const riskLevel = getChainRiskLevel(graph, path);
      chains.push({
        id: `chain_${chainId++}`,
        nodes: [...path],
        totalAmount,
        riskLevel,
        description: describeChain(graph, path, totalAmount),
      });
    } else {
      for (const edge of unvisitedEdges) {
        extractChain(edge.target, [...path], totalAmount);
      }
    }
  }

  extractChain("property_root", [], 0);

  const longestChain = chains.reduce((max, c) => Math.max(max, c.nodes.length), 0);
  const maxChainAmount = chains.reduce((max, c) => Math.max(max, c.totalAmount), 0);

  return { chains, longestChain, maxChainAmount };
}

function getChainRiskLevel(
  graph: RightsGraph,
  path: string[],
): ChainAnalysisResult["chains"][0]["riskLevel"] {
  const avgRisk = path.reduce((sum, id) => {
    const node = graph.nodes.get(id);
    return sum + (node?.riskWeight || 0);
  }, 0) / path.length;

  if (avgRisk > 0.7) return "critical";
  if (avgRisk > 0.5) return "high";
  if (avgRisk > 0.3) return "medium";
  return "low";
}

function describeChain(
  graph: RightsGraph,
  path: string[],
  totalAmount: number,
): string {
  const types = path.map((id) => graph.nodes.get(id)?.type || "unknown");
  const hasSeizure = types.includes("seizure");
  const hasMortgage = types.includes("mortgage");
  const hasLease = types.includes("lease");

  const parts: string[] = [`체인 길이 ${path.length}단계, 총 채권액 ${formatAmount(totalAmount)}`];

  if (hasSeizure && hasMortgage) {
    parts.push("근저당-압류 복합 체인으로 강제집행 위험");
  }
  if (hasSeizure && hasLease) {
    parts.push("임차권-압류 체인으로 보증금 회수 위험");
  }

  return parts.join(". ");
}

// ─── 최대 위험 경로 (Dijkstra 변형) ───

export function findCriticalPath(
  graph: RightsGraph,
  estimatedPrice: number,
): CriticalPathResult {
  const startId = "property_root";
  const maxRisk = new Map<string, number>();
  const predecessor = new Map<string, string>();

  for (const id of graph.nodes.keys()) {
    maxRisk.set(id, -Infinity);
  }
  maxRisk.set(startId, 0);

  const visited = new Set<string>();
  const order: string[] = [];

  function topologicalSort(nodeId: string): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const neighbors = graph.adjacency.get(nodeId) || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.target)) {
        topologicalSort(edge.target);
      }
    }
    order.unshift(nodeId);
  }

  for (const id of graph.nodes.keys()) {
    topologicalSort(id);
  }

  for (const nodeId of order) {
    const currentRisk = maxRisk.get(nodeId) || 0;
    const neighbors = graph.adjacency.get(nodeId) || [];

    for (const edge of neighbors) {
      const node = graph.nodes.get(edge.target);
      const edgeRisk = currentRisk + edge.weight + (node?.riskWeight || 0);

      if (edgeRisk > (maxRisk.get(edge.target) || -Infinity)) {
        maxRisk.set(edge.target, edgeRisk);
        predecessor.set(edge.target, nodeId);
      }
    }
  }

  let maxTerminalRisk = 0;
  let maxTerminalId = startId;
  for (const [id, risk] of maxRisk) {
    if (risk > maxTerminalRisk && id !== startId) {
      maxTerminalRisk = risk;
      maxTerminalId = id;
    }
  }

  const path: string[] = [];
  const pathVisited = new Set<string>();
  let current: string | undefined = maxTerminalId;
  while (current && !pathVisited.has(current)) {
    pathVisited.add(current);
    path.unshift(current);
    current = predecessor.get(current);
  }

  const maxLossAmount = path.reduce((sum, id) => {
    const node = graph.nodes.get(id);
    return sum + (node?.amount || 0);
  }, 0);

  return {
    path,
    totalRisk: Math.min(100, Math.round(maxTerminalRisk * 50)),
    maxLossAmount: Math.min(maxLossAmount, estimatedPrice),
    description: `최대 피해 경로: ${path.map((id) => graph.nodes.get(id)?.label || id).join(" → ")}`,
  };
}

// ─── 클러스터 분석 (연결 요소) ───

export function analyzeCluster(graph: RightsGraph): ClusterResult {
  const visited = new Set<string>();
  const clusters: ClusterResult["clusters"] = [];
  let clusterId = 0;

  function bfs(startId: string): string[] {
    const queue = [startId];
    const cluster: string[] = [];
    visited.add(startId);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      cluster.push(nodeId);

      const outEdges = graph.adjacency.get(nodeId) || [];
      const inEdges = graph.reverseAdj.get(nodeId) || [];

      for (const edge of [...outEdges, ...inEdges]) {
        const neighborId = edge.source === nodeId ? edge.target : edge.source;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    return cluster;
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      const clusterNodes = bfs(nodeId);
      if (clusterNodes.length > 0) {
        const internalRisk = clusterNodes.reduce((sum, id) => {
          const node = graph.nodes.get(id);
          return sum + (node?.riskWeight || 0);
        }, 0) / clusterNodes.length;

        clusters.push({
          id: clusterId++,
          nodes: clusterNodes,
          internalRisk: Math.round(internalRisk * 100) / 100,
          connectedTo: [],
        });
      }
    }
  }

  const nodeToCluster = new Map<string, number>();
  for (const cluster of clusters) {
    for (const nodeId of cluster.nodes) {
      nodeToCluster.set(nodeId, cluster.id);
    }
  }

  for (const edge of graph.edges) {
    const srcCluster = nodeToCluster.get(edge.source);
    const tgtCluster = nodeToCluster.get(edge.target);
    if (srcCluster !== undefined && tgtCluster !== undefined && srcCluster !== tgtCluster) {
      const cluster = clusters.find((c) => c.id === srcCluster);
      if (cluster && !cluster.connectedTo.includes(tgtCluster)) {
        cluster.connectedTo.push(tgtCluster);
      }
    }
  }

  const isolatedNodes = clusters
    .filter((c) => c.nodes.length === 1 && c.connectedTo.length === 0)
    .flatMap((c) => c.nodes);

  return { clusters, isolatedNodes };
}
