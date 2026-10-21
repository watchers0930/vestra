"use client";

/**
 * 권리관계 그래프 시각화 — 조합 컴포넌트 (설계 §4.8 ⑧)
 *
 * 서버 그래프 엔진(lib/rights-graph-engine) 결과를 표시 전용으로 조합한다.
 * - 노드/범례/위험지수를 하위 컴포넌트로 분리(graph/*)
 * - 노드 평균 지표는 "권리 구성 참고 지수"로 명명(사고확률·종합위험도 아님)
 * - 종합 위험도는 ①의 공용 안전/위험점수에서만 파생하며 그래프 지수를 합산하지 않는다
 */
import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/common";
import type { ParsedRegistry } from "@/lib/registry-parser";
import { buildGraph, type GraphAnalysisProp } from "./graph/graph-types";
import { RightsGraphNode } from "./graph/RightsGraphNode";
import { RightsGraphLegend } from "./graph/RightsGraphLegend";
import { RightsRiskIndexPanel } from "./graph/RightsRiskIndexPanel";

interface Props {
  parsed: ParsedRegistry;
  graphAnalysis?: GraphAnalysisProp;
}

export function RightsGraphView({ parsed, graphAnalysis }: Props) {
  const { nodes, chains } = useMemo(() => buildGraph(parsed), [parsed]);

  const activeNodes = nodes.filter((n) => !n.isCancelled);
  const cancelledNodes = nodes.filter((n) => n.isCancelled);
  // 노드 위험가중치 평균 — "권리 구성 참고 지수"(종합 위험도·사고확률 아님)
  const compositionIndex = activeNodes.reduce((s, n) => s + n.riskWeight, 0) / Math.max(activeNodes.length, 1);
  const idxColor = compositionIndex > 0.5 ? "#dc2626" : compositionIndex > 0.3 ? "#d97706" : "#16a34a";
  const idxBg = compositionIndex > 0.5 ? "#fef2f2" : compositionIndex > 0.3 ? "#fffbeb" : "#f0fdf4";

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
        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: idxBg }}>
          <p className="text-xs" style={{ color: idxColor }}>권리 구성 참고 지수</p>
          <p className="text-xl font-bold" style={{ color: idxColor }}>{(compositionIndex * 100).toFixed(0)}</p>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 px-1 -mt-2">
        &lsquo;권리 구성 참고 지수&rsquo;는 권리 종류 구성의 참고 수치이며 사고 확률·종합 위험도가 아닙니다. 종합 판단은 상단 안전점수를 기준으로 하세요.
      </p>

      {/* 위험 전파 경로 */}
      {chains.length > 0 && (
        <Card className="p-4 border-red-200 bg-red-50/50">
          <h4 className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-2">
            <AlertTriangle size={14} aria-hidden />
            위험 전파 경로 감지
          </h4>
          {chains.map((chain, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-red-700 flex-wrap">
              {chain.path.map((nodeId, j) => {
                const node = nodes.find((n) => n.id === nodeId);
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
                참고 지수 {(chain.totalRisk * 100).toFixed(0)}
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* 노드 시각화 + 범례 */}
      <RightsGraphNode nodes={nodes} />
      <RightsGraphLegend />

      {/* 권리 그래프 위험지수 (엔진 결과 제공 시) */}
      {graphAnalysis && <RightsRiskIndexPanel graphAnalysis={graphAnalysis} />}
    </div>
  );
}
