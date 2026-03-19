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

// ─── 그래프 자료구조 ───

export interface GraphNode {
  id: string;
  type: "property" | "mortgage" | "seizure" | "lease" | "trust" | "owner" | "creditor";
  label: string;
  amount: number;           // 채권액/보증금 (원)
  date: string;             // 설정일
  priority: number;         // 순위 (낮을수록 선순위)
  riskWeight: number;       // 노드 고유 위험 가중치 0-1
  metadata: Record<string, string | number | boolean>;
}

export interface GraphEdge {
  id: string;
  source: string;           // 출발 노드 ID
  target: string;           // 도착 노드 ID
  type: "claim" | "ownership" | "subordination" | "conflict" | "dependency";
  weight: number;           // 엣지 가중치 (위험 전파 강도)
  label: string;
}

export interface RightsGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  adjacency: Map<string, GraphEdge[]>;     // 출발 노드 → 엣지 리스트
  reverseAdj: Map<string, GraphEdge[]>;    // 도착 노드 → 역방향 엣지 리스트
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
  nodeRisks: Map<string, number>;  // 노드별 전파 후 위험도
  propagationSteps: Array<{
    from: string;
    to: string;
    riskDelta: number;
    iteration: number;
  }>;
  convergenceIterations: number;
  totalSystemRisk: number;         // 시스템 전체 위험도 0-100
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

// ─── 그래프 구축 ───

/**
 * 등기부등본 파싱 결과로부터 권리관계 그래프 구축
 *
 * 특허 청구항:
 * (a) 등기부등본의 갑구(소유권)/을구(기타권리) 항목을 노드로 변환
 * (b) 순위, 시간순서, 법적 종속 관계를 엣지로 연결
 * (c) 금액, 위험도를 가중치로 부여
 */
export function buildRightsGraph(
  parsed: ParsedRegistry,
  estimatedPrice: number = 0,
): RightsGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // 부동산 루트 노드
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

  // 갑구 (소유권 관련) 노드 생성
  for (const entry of parsed.gapgu) {
    if (entry.isCancelled) continue;

    const nodeId = `gapgu_${entry.order}`;
    const type = getNodeType(entry.purpose);
    const riskWeight = getBaseRiskWeight(type);

    nodes.set(nodeId, {
      id: nodeId,
      type,
      label: `${entry.purpose} (${entry.holder})`,
      amount: 0, // 갑구에는 금액 필드 없음
      date: entry.date,
      priority: entry.order,
      riskWeight,
      metadata: {
        purpose: entry.purpose,
        holder: entry.holder,
        isCancelled: entry.isCancelled,
      },
    });

    // 부동산 → 갑구 항목 엣지
    edges.push({
      id: `edge_prop_${nodeId}`,
      source: propertyId,
      target: nodeId,
      type: type === "owner" ? "ownership" : "claim",
      weight: riskWeight,
      label: entry.purpose,
    });
  }

  // 을구 (근저당, 전세권 등) 노드 생성
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

    // 부동산 → 을구 항목 엣지
    edges.push({
      id: `edge_prop_${nodeId}`,
      source: propertyId,
      target: nodeId,
      type: "claim",
      weight: riskWeight * (entry.amount / Math.max(estimatedPrice, 1)),
      label: entry.purpose,
    });
  }

  // 순위 기반 종속 관계 엣지 (선순위 → 후순위)
  const allEntries = [
    ...parsed.gapgu.filter((e) => !e.isCancelled).map((e) => ({ ...e, section: "gapgu" })),
    ...parsed.eulgu.filter((e) => !e.isCancelled).map((e) => ({ ...e, section: "eulgu" })),
  ].sort((a, b) => {
    // 날짜 기준 정렬
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

  // 충돌 관계 엣지 (압류↔근저당, 가처분↔소유권이전 등)
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

  // 인접 리스트 구축
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

// ─── 순환 탐지 (DFS 기반) ───

/**
 * 권리관계 그래프에서 순환 구조 탐지
 *
 * 특허 청구항: 등기부등본의 권리관계에서 순환적 종속
 * (예: A→B→C→A 형태의 상호 채권 관계)을 자동 탐지하여
 * 법적 분쟁 가능성 경고
 */
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
        // 순환 발견
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
    .slice(0, -1); // 마지막은 처음과 같으므로 제거
  return `순환적 권리관계 발견: ${labels.join(" → ")} → (순환)`;
}

// ─── 위험 전파 알고리즘 (PageRank 변형) ───

/**
 * 그래프 내 위험도 전파 (수정 PageRank)
 *
 * 특허 청구항: 개별 권리 항목의 위험도가 연결된
 * 다른 권리 항목에 전파되는 과정을 시뮬레이션.
 * 댐핑 팩터를 적용하여 전파 감쇠 모델링.
 *
 * R(v) = (1-d)/N + d × Σ[R(u) × w(u,v) / out(u)]
 * d: 댐핑 팩터 (0.85), N: 노드 수, w: 엣지 가중치
 */
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

  // 초기 위험도: 노드 고유 위험 가중치
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
      // 기본 위험도 (댐핑되지 않는 부분)
      let newRisk = (1 - dampingFactor) * node.riskWeight;

      // 이웃 노드로부터의 위험 전파
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

    // 수렴 확인
    if (maxDelta < convergenceThreshold) converged = true;

    for (const [id, risk] of newRisks) {
      risks.set(id, risk);
    }
    iteration++;
  }

  // 전체 시스템 위험도
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

/**
 * 권리관계 체인 분석 (근저당→전세→압류 등의 연쇄 구조)
 *
 * 특허 청구항: DFS로 모든 권리 체인을 추출하고,
 * 체인 내 총 채권액과 위험도를 산출하여
 * 최대 피해 시나리오를 자동 식별
 */
export function analyzeChains(graph: RightsGraph): ChainAnalysisResult {
  const chains: ChainAnalysisResult["chains"] = [];
  const visited = new Set<string>();
  let chainId = 0;

  // 루트 노드(property)에서 시작하는 모든 체인 추출
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
      // 체인 종단: 결과 저장
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

/**
 * 최대 위험 경로 산출 (Critical Path Analysis)
 *
 * 특허 청구항: Dijkstra 알고리즘을 역전시켜
 * 부동산에서 시작하여 최대 피해에 이르는 경로를 탐색.
 * 가중치가 높은 경로(=위험한 경로)를 우선 탐색.
 */
export function findCriticalPath(
  graph: RightsGraph,
  estimatedPrice: number,
): CriticalPathResult {
  const startId = "property_root";
  const maxRisk = new Map<string, number>();
  const predecessor = new Map<string, string>();

  // 초기화
  for (const id of graph.nodes.keys()) {
    maxRisk.set(id, -Infinity);
  }
  maxRisk.set(startId, 0);

  // 위상 정렬 기반 최장 경로 (DAG 가정, 순환은 무시)
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

  // 최장 경로 계산
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

  // 최대 위험 종단 노드 찾기
  let maxTerminalRisk = 0;
  let maxTerminalId = startId;
  for (const [id, risk] of maxRisk) {
    if (risk > maxTerminalRisk && id !== startId) {
      maxTerminalRisk = risk;
      maxTerminalId = id;
    }
  }

  // 경로 역추적
  const path: string[] = [];
  let current: string | undefined = maxTerminalId;
  while (current) {
    path.unshift(current);
    current = predecessor.get(current);
  }

  // 경로 내 총 손실 금액
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

/**
 * 권리관계 클러스터 분석 (연결 요소 탐색)
 *
 * 같은 권리자/채권자와 관련된 항목을 클러스터링하여
 * 동일 주체의 복수 권리 행사 패턴 탐지
 */
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

      // 양방향 탐색
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

  // 클러스터 간 연결 관계 매핑
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

// ─── 메인 분석 함수 ───

/**
 * 권리관계 그래프 종합 분석
 *
 * 특허 청구항 핵심:
 * (a) 등기부등본 데이터를 방향 가중 그래프로 변환
 * (b) DFS 기반 순환 탐지로 상호 종속 위험 식별
 * (c) 수정 PageRank로 위험도 전파 시뮬레이션
 * (d) 체인 분석으로 연쇄 위험 구조 파악
 * (e) 변형 Dijkstra로 최대 피해 경로 산출
 * (f) BFS 기반 클러스터링으로 동일 주체 복수 권리 탐지
 */
export function analyzeRightsGraph(
  parsed: ParsedRegistry,
  estimatedPrice: number = 0,
): GraphAnalysisResult {
  // Step 1: 그래프 구축
  const graph = buildRightsGraph(parsed, estimatedPrice);

  // Step 2: 순환 탐지
  const cycles = detectCycles(graph);

  // Step 3: 위험 전파
  const riskPropagation = propagateRisk(graph);

  // Step 4: 체인 분석
  const chainAnalysis = analyzeChains(graph);

  // Step 5: 최대 위험 경로
  const criticalPath = findCriticalPath(graph, estimatedPrice);

  // Step 6: 클러스터 분석
  const clusterAnalysis = analyzeCluster(graph);

  // 그래프 깊이 계산
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

function formatAmount(amount: number): string {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억원`;
  if (amount >= 10_000) return `${(amount / 10_000).toFixed(0)}만원`;
  return `${amount}원`;
}

function calculateMaxDepth(graph: RightsGraph): number {
  const depths = new Map<string, number>();

  function dfs(nodeId: string, depth: number, visited: Set<string>): number {
    if (visited.has(nodeId)) return depth;
    visited.add(nodeId);
    depths.set(nodeId, Math.max(depths.get(nodeId) || 0, depth));

    let maxDepth = depth;
    const neighbors = graph.adjacency.get(nodeId) || [];
    for (const edge of neighbors) {
      maxDepth = Math.max(maxDepth, dfs(edge.target, depth + 1, new Set(visited)));
    }
    return maxDepth;
  }

  return dfs("property_root", 0, new Set());
}
