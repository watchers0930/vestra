"use client";

/**
 * RightsRiskIndexPanel — 권리 그래프 위험지수 (설계 §4.8 ⑧)
 *
 * 서버 그래프 엔진(lib/rights-graph-engine) 결과를 표시 전용으로 보여준다.
 * 이 지수는 "권리 그래프 위험지수"이며 ①의 공용 종합 안전/위험점수가 아니다.
 * 그래프 지수를 종합점수에 다시 합산하지 않는다.
 */
import { AlertTriangle, Activity, Route, BarChart3 } from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { Card, Alert } from "@/components/common";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { GraphAnalysisProp } from "./graph-types";

function friendlyNodeLabel(nodeId: string): string {
  return nodeId
    .replace(/^property[_ ]?root$/, "부동산")
    .replace(/^gapgu[_ ]?(\d+)$/, "갑구 $1번")
    .replace(/^eulgu[_ ]?(\d+)$/, "을구 $1번")
    .replace(/_/g, " ");
}

interface Props {
  graphAnalysis: GraphAnalysisProp;
}

export function RightsRiskIndexPanel({ graphAnalysis }: Props) {
  const sysRisk = graphAnalysis.riskPropagation.totalSystemRisk;
  const isHigh = sysRisk >= 70;
  const isMid = sysRisk >= 40;

  return (
    <>
      {/* 권리 그래프 위험지수 (종합 안전/위험점수와 별개) */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-1">
          <Activity size={14} aria-hidden />
          권리 그래프 위험지수
        </h4>
        <p className="text-[11px] text-gray-400 mb-3">
          권리 구성·연결 기반 참고 지수입니다. 화면 상단의 종합 안전점수와는 다른 척도이며 종합점수에 합산되지 않습니다.
        </p>
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center border-4 flex-shrink-0",
              isHigh ? "border-red-400 bg-red-50" : isMid ? "border-amber-400 bg-amber-50" : "border-emerald-400 bg-emerald-50",
            )}
          >
            <span className={cn("text-2xl font-bold", isHigh ? "text-red-600" : isMid ? "text-amber-600" : "text-emerald-600")}>
              {sysRisk}
            </span>
          </div>
          <div className="flex-1 space-y-1.5">
            <p className="text-xs text-gray-500">권리 그래프 위험지수 (0-100, 높을수록 주의)</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={cn("h-2 rounded-full transition-all", isHigh ? "bg-red-500" : isMid ? "bg-amber-500" : "bg-emerald-500")}
                style={{ width: `${Math.max(0, Math.min(100, sysRisk))}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mt-2">
              <div><span className="font-medium text-gray-700">{graphAnalysis.graph.nodeCount}</span> 항목</div>
              <div><span className="font-medium text-gray-700">{graphAnalysis.graph.edgeCount}</span> 연결</div>
              <div>단계 <span className="font-medium text-gray-700">{graphAnalysis.graph.maxDepth}</span></div>
            </div>
          </div>
        </div>
      </Card>

      {/* 순환 경고 */}
      {graphAnalysis.cycles.hasCycle && (
        <Alert variant="error">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-red-800 mb-1">권리 순환 관계가 감지되었습니다</p>
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

      {/* 주요 권리 연결 경로 */}
      {graphAnalysis.criticalPath.path.length > 1 && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
            <Route size={14} aria-hidden />
            주요 권리 연결 경로
          </h4>
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            {graphAnalysis.criticalPath.path.map((nodeId, i) => (
              <span key={nodeId} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-400 text-xs">→</span>}
                <span className={cn("px-2 py-1 rounded text-xs font-medium", i === 0 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700")}>
                  {friendlyNodeLabel(nodeId)}
                </span>
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={cn("p-2 rounded-lg text-center", isHigh ? "bg-red-50" : isMid ? "bg-amber-50" : "bg-gray-50")}>
              <p className={cn("text-[10px]", isHigh ? "text-red-600" : isMid ? "text-amber-600" : "text-gray-500")}>경로 위험도</p>
              <p className={cn("text-lg font-bold", isHigh ? "text-red-700" : isMid ? "text-amber-700" : "text-gray-700")}>
                {graphAnalysis.criticalPath.totalRisk}
              </p>
            </div>
            <div className={cn("p-2 rounded-lg text-center", isHigh ? "bg-red-50" : isMid ? "bg-amber-50" : "bg-gray-50")}>
              <p className={cn("text-[10px]", isHigh ? "text-red-600" : isMid ? "text-amber-600" : "text-gray-500")}>최대 관련 금액</p>
              <p className={cn("text-lg font-bold", isHigh ? "text-red-700" : isMid ? "text-amber-700" : "text-gray-700")}>
                {graphAnalysis.criticalPath.maxLossAmount > 0 ? formatKRW(graphAnalysis.criticalPath.maxLossAmount) : "-"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 항목별 위험도 점수 (BarChart) */}
      {Object.keys(graphAnalysis.riskPropagation.nodeRisks).length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
            <BarChart3 size={14} aria-hidden />
            항목별 위험도 점수
          </h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(graphAnalysis.riskPropagation.nodeRisks)
                  .map(([id, risk]) => ({ name: friendlyNodeLabel(id), risk: Math.round(Number(risk) * 100) }))
                  .sort((a, b) => b.risk - a.risk)}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} angle={-30} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(v) => `${v}`} />
                <Tooltip formatter={(value) => [`${value}점`, "위험도"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="risk" radius={[4, 4, 0, 0]} fill={isHigh ? "#ef4444" : isMid ? "#f59e0b" : "#6b7280"} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">등기 항목 간 위험도 연관 분석 결과(참고 지수)</p>
        </Card>
      )}
    </>
  );
}
