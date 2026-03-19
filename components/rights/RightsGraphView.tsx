"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle, XCircle, GitBranch, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/common";
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

interface Props {
  parsed: ParsedRegistry;
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

export function RightsGraphView({ parsed }: Props) {
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
    </div>
  );
}
