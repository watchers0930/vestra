"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle, XCircle, GitBranch, Shield, Activity, Route, BarChart3 } from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { Card, Alert } from "@/components/common";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ParsedRegistry } from "@/lib/registry-parser";

/**
 * 권리관계 그래프 시각화 컴포넌트
 * rights-graph-engine의 분석 결과를 시각적으로 표현
 */

interface GraphNode {
  id: string;
  label: string;
  type: "property" | "ownership" | "mortgage" | "lease" | "seizure" | "trust" | "other";
  amount: number;
  riskWeight: number;
  isCancelled?: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  label: string;
  weight: number;
}

interface RiskChain {
  path: string[];
  totalRisk: number;
  level: "critical" | "high" | "medium" | "low";
}

interface GraphAnalysisProp {
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

interface Props {
  parsed: ParsedRegistry;
  graphAnalysis?: GraphAnalysisProp;
}

// 노드 색상
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  property: { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-800" },
  ownership: { bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-800" },
  mortgage: { bg: "bg-red-100", border: "border-red-400", text: "text-red-800" },
  lease: { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-800" },
  seizure: { bg: "bg-purple-100", border: "border-purple-400", text: "text-purple-800" },
  trust: { bg: "bg-indigo-100", border: "border-indigo-400", text: "text-indigo-800" },
  other: { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-800" },
};

function getNodeType(purpose: string): GraphNode["type"] {
  if (/소유권/.test(purpose)) return "ownership";
  if (/근저당|저당/.test(purpose)) return "mortgage";
  if (/전세|임차/.test(purpose)) return "lease";
  if (/가압류|압류|가처분|경매/.test(purpose)) return "seizure";
  if (/신탁/.test(purpose)) return "trust";
  return "other";
}

function getRiskWeight(type: GraphNode["type"]): number {
  const weights: Record<string, number> = {
    seizure: 0.95, mortgage: 0.7, trust: 0.6,
    lease: 0.4, ownership: 0.1, property: 0, other: 0.3,
  };
  return weights[type] ?? 0.3;
}

export function RightsGraphView({ parsed, graphAnalysis }: Props) {
  const { nodes, edges, chains } = useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // 부동산 루트 노드
    const propertyLabel = parsed.title?.address || "대상 부동산";
    nodes.push({
      id: "property",
      label: propertyLabel.length > 20 ? propertyLabel.slice(0, 20) + "…" : propertyLabel,
      type: "property",
      amount: 0,
      riskWeight: 0,
    });

    // 갑구 노드
    parsed.gapgu?.forEach((entry, i) => {
      const type = getNodeType(entry.purpose);
      nodes.push({
        id: `gapgu_${i}`,
        label: `${entry.purpose}\n${entry.holder}`,
        type,
        amount: 0,
        riskWeight: getRiskWeight(type),
        isCancelled: entry.isCancelled,
      });
      edges.push({
        source: "property",
        target: `gapgu_${i}`,
        label: "갑구",
        weight: getRiskWeight(type),
      });
    });

    // 을구 노드
    parsed.eulgu?.forEach((entry, i) => {
      const type = getNodeType(entry.purpose);
      nodes.push({
        id: `eulgu_${i}`,
        label: `${entry.purpose}\n${entry.holder}`,
        type,
        amount: entry.amount || 0,
        riskWeight: getRiskWeight(type),
        isCancelled: entry.isCancelled,
      });
      edges.push({
        source: "property",
        target: `eulgu_${i}`,
        label: "을구",
        weight: getRiskWeight(type),
      });
    });

    // 위험 체인 분석 (간단한 휴리스틱)
    const chains: RiskChain[] = [];
    const activeNodes = nodes.filter(n => !n.isCancelled && n.id !== "property");
    const highRiskNodes = activeNodes.filter(n => n.riskWeight >= 0.7);

    if (highRiskNodes.length >= 2) {
      chains.push({
        path: ["property", ...highRiskNodes.map(n => n.id)],
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

    return { nodes, edges, chains };
  }, [parsed]);

  const activeNodes = nodes.filter(n => !n.isCancelled);
  const cancelledNodes = nodes.filter(n => n.isCancelled);
  const riskScore = activeNodes.reduce((s, n) => s + n.riskWeight, 0) / Math.max(activeNodes.length, 1);

  return (
    <div className="space-y-4">
      {/* 그래프 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-xs text-blue-600">전체 노드</p>
          <p className="text-xl font-bold text-blue-800">{nodes.length}</p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-lg text-center">
          <p className="text-xs text-emerald-600">유효 권리</p>
          <p className="text-xl font-bold text-emerald-800">{activeNodes.length - 1}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-xs text-gray-600">말소</p>
          <p className="text-xl font-bold text-gray-800">{cancelledNodes.length}</p>
        </div>
        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: riskScore > 0.5 ? "#fef2f2" : riskScore > 0.3 ? "#fffbeb" : "#f0fdf4" }}>
          <p className="text-xs" style={{ color: riskScore > 0.5 ? "#dc2626" : riskScore > 0.3 ? "#d97706" : "#16a34a" }}>위험도</p>
          <p className="text-xl font-bold" style={{ color: riskScore > 0.5 ? "#dc2626" : riskScore > 0.3 ? "#d97706" : "#16a34a" }}>{(riskScore * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* 위험 체인 */}
      {chains.length > 0 && (
        <Card className="p-4 border-red-200 bg-red-50/50">
          <h4 className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-2">
            <AlertTriangle size={14} />
            위험 전파 경로 감지
          </h4>
          {chains.map((chain, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-red-700 flex-wrap">
              {chain.path.map((nodeId, j) => {
                const node = nodes.find(n => n.id === nodeId);
                return (
                  <span key={nodeId} className="flex items-center gap-1">
                    {j > 0 && <span className="text-red-400">→</span>}
                    <span className="px-2 py-0.5 bg-red-100 rounded font-medium">
                      {node?.label.split("\n")[0] || nodeId}
                    </span>
                  </span>
                );
              })}
              <span className="ml-2 px-2 py-0.5 bg-red-200 rounded-full text-[10px] font-semibold">
                위험도 {(chain.totalRisk * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* 그래프 노드 시각화 */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <GitBranch size={14} />
          권리관계 그래프
        </h4>

        {/* 루트 노드 (부동산) */}
        <div className="flex justify-center mb-4">
          <div className="px-4 py-2 bg-blue-100 border-2 border-blue-400 rounded-lg text-center">
            <p className="text-xs font-bold text-blue-800">{nodes[0]?.label}</p>
            <p className="text-[10px] text-blue-600">대상 부동산</p>
          </div>
        </div>

        {/* 연결선 표시 */}
        <div className="flex justify-center mb-2">
          <div className="w-0.5 h-6 bg-gray-300" />
        </div>

        {/* 하위 노드들 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {nodes.slice(1).map((node) => {
            const colors = NODE_COLORS[node.type] || NODE_COLORS.other;
            return (
              <div
                key={node.id}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all",
                  node.isCancelled ? "opacity-40 border-gray-300 bg-gray-50" : `${colors.bg} ${colors.border}`
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-xs font-semibold", node.isCancelled ? "text-gray-500 line-through" : colors.text)}>
                    {node.label.split("\n")[0]}
                  </span>
                  {node.isCancelled ? (
                    <span className="text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">말소</span>
                  ) : node.riskWeight >= 0.7 ? (
                    <XCircle size={12} className="text-red-500" />
                  ) : node.riskWeight >= 0.4 ? (
                    <AlertTriangle size={12} className="text-amber-500" />
                  ) : (
                    <CheckCircle size={12} className="text-emerald-500" />
                  )}
                </div>
                <p className="text-[10px] text-gray-600">{node.label.split("\n")[1] || ""}</p>
                {node.amount > 0 && (
                  <p className="text-[10px] font-medium text-gray-700 mt-1">
                    {(node.amount / 100000000).toFixed(1)}억원
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {nodes.length <= 1 && (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            <Shield size={16} className="mr-2" />
            등기부 데이터에서 권리관계를 추출할 수 없습니다
          </div>
        )}
      </Card>

      {/* 범례 */}
      <div className="flex flex-wrap gap-2 px-1">
        {Object.entries(NODE_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={cn("w-3 h-3 rounded border", colors.bg, colors.border)} />
            <span className="text-[10px] text-gray-500">
              {{ property: "부동산", ownership: "소유권", mortgage: "근저당", lease: "전세/임차", seizure: "압류/가처분", trust: "신탁", other: "기타" }[type]}
            </span>
          </div>
        ))}
      </div>

      {/* ─── 그래프 엔진 분석 결과 (graphAnalysis 제공 시) ─── */}
      {graphAnalysis && (
        <>
          {/* 시스템 위험도 */}
          <Card className="p-4">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
              <Activity size={14} />
              시스템 위험도
            </h4>
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center border-4",
                  graphAnalysis.riskPropagation.totalSystemRisk >= 70
                    ? "border-red-400 bg-red-50"
                    : graphAnalysis.riskPropagation.totalSystemRisk >= 40
                    ? "border-amber-400 bg-amber-50"
                    : "border-emerald-400 bg-emerald-50"
                )}
              >
                <span
                  className={cn(
                    "text-2xl font-bold",
                    graphAnalysis.riskPropagation.totalSystemRisk >= 70
                      ? "text-red-600"
                      : graphAnalysis.riskPropagation.totalSystemRisk >= 40
                      ? "text-amber-600"
                      : "text-emerald-600"
                  )}
                >
                  {graphAnalysis.riskPropagation.totalSystemRisk}
                </span>
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="text-xs text-gray-500">
                  PageRank 변형 위험 전파 알고리즘 결과 (0-100)
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      graphAnalysis.riskPropagation.totalSystemRisk >= 70
                        ? "bg-red-500"
                        : graphAnalysis.riskPropagation.totalSystemRisk >= 40
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    )}
                    style={{ width: `${graphAnalysis.riskPropagation.totalSystemRisk}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mt-2">
                  <div>
                    <span className="font-medium text-gray-700">{graphAnalysis.graph.nodeCount}</span> 노드
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{graphAnalysis.graph.edgeCount}</span> 엣지
                  </div>
                  <div>
                    깊이 <span className="font-medium text-gray-700">{graphAnalysis.graph.maxDepth}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 순환 경고 */}
          {graphAnalysis.cycles.hasCycle && (
            <Alert variant="error">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800 mb-1">
                    권리 순환 관계가 감지되었습니다
                  </p>
                  <div className="space-y-1">
                    {graphAnalysis.cycles.cycles.map((cycle, i) => (
                      <p key={i} className="text-xs text-red-700">
                        {cycle.description} (위험도: {cycle.riskScore.toFixed(0)})
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </Alert>
          )}

          {/* Critical Path */}
          {graphAnalysis.criticalPath.path.length > 1 && (
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Route size={14} />
                최대 위험 경로 (Critical Path)
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {graphAnalysis.criticalPath.path.map((nodeId, i) => (
                  <span key={nodeId} className="flex items-center gap-1">
                    {i > 0 && <span className="text-gray-400 text-xs">→</span>}
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        i === 0
                          ? "bg-blue-100 text-blue-800"
                          : i === graphAnalysis.criticalPath.path.length - 1
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {nodeId.replace(/_/g, " ")}
                    </span>
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-red-50 rounded-lg text-center">
                  <p className="text-[10px] text-red-600">경로 위험도</p>
                  <p className="text-lg font-bold text-red-700">{graphAnalysis.criticalPath.totalRisk}</p>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg text-center">
                  <p className="text-[10px] text-orange-600">최대 피해 금액</p>
                  <p className="text-lg font-bold text-orange-700">
                    {graphAnalysis.criticalPath.maxLossAmount > 0
                      ? formatKRW(graphAnalysis.criticalPath.maxLossAmount)
                      : "-"}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* 위험 전파 점수 (BarChart) */}
          {Object.keys(graphAnalysis.riskPropagation.nodeRisks).length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <BarChart3 size={14} />
                노드별 위험 전파 점수
              </h4>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(graphAnalysis.riskPropagation.nodeRisks)
                      .map(([id, risk]) => ({
                        name: id.replace(/_/g, " ").replace(/^(gapgu|eulgu) /, (m) =>
                          m.includes("gapgu") ? "갑 " : "을 "
                        ),
                        risk: Math.round(Number(risk) * 100),
                      }))
                      .sort((a, b) => b.risk - a.risk)}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      angle={-30}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}점`, "위험도"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar
                      dataKey="risk"
                      radius={[4, 4, 0, 0]}
                      fill="#ef4444"
                      fillOpacity={0.8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                수정 PageRank 알고리즘 기반 위험 전파 시뮬레이션 ({graphAnalysis.riskPropagation.convergenceIterations}회 반복 수렴)
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
