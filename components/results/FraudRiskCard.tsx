"use client";

/**
 * 전세사기 위험도 카드 컴포넌트
 * ──────────────────────────────
 * 사기 위험 점수, 기여도 Top 5, 유사 사례를 시각화.
 */

import type { FraudRiskResult } from "@/lib/patent-types";
import { Card, CardHeader } from "@/components/common/Card";

interface FraudRiskCardProps {
  result: FraudRiskResult;
}

const RISK_COLORS: Record<string, string> = {
  safe: "#22c55e",
  caution: "#84cc16",
  warning: "#f59e0b",
  danger: "#ef4444",
  critical: "#dc2626",
};

const RISK_BG: Record<string, string> = {
  safe: "bg-green-50 dark:bg-green-950/30",
  caution: "bg-lime-50 dark:bg-lime-950/30",
  warning: "bg-amber-50 dark:bg-amber-950/30",
  danger: "bg-red-50 dark:bg-red-950/30",
  critical: "bg-red-100 dark:bg-red-950/50",
};

export default function FraudRiskCard({ result }: FraudRiskCardProps) {
  const color = RISK_COLORS[result.riskLevel] || "#6b7280";
  const bgClass = RISK_BG[result.riskLevel] || "";

  // 기여도 바 최대값
  const maxContribution = Math.max(
    ...result.topRiskFactors.map((f) => Math.abs(f.contribution)),
    1,
  );

  return (
    <Card>
      <CardHeader title="전세사기 위험 평가" />

      {/* 위험도 게이지 */}
      <div className={`mx-4 mb-4 rounded-lg p-4 ${bgClass}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-70">사기 위험도</div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-3xl font-bold"
                style={{ color }}
              >
                {result.fraudScore}
              </span>
              <span className="text-sm opacity-50">/ 100</span>
            </div>
          </div>
          <div
            className="rounded-full px-3 py-1 text-sm font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            {result.riskLabel}
          </div>
        </div>

        {/* 프로그레스 바 */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${result.fraudScore}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      {/* 기여도 Top 5 (워터폴 차트) */}
      <div className="mx-4 mb-4">
        <h4 className="mb-2 text-sm font-semibold opacity-70">
          위험 기여도 분석 (SHAP)
        </h4>
        <div className="space-y-2">
          {result.topRiskFactors.map((factor, i) => {
            const isPositive = factor.contribution > 0;
            const barWidth =
              (Math.abs(factor.contribution) / maxContribution) * 100;

            return (
              <div key={i} className="flex items-center gap-2">
                <div className="w-24 truncate text-xs opacity-70">
                  {factor.featureName}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    {/* 중앙선 기준 좌/우 */}
                    <div className="relative h-4 flex-1">
                      <div
                        className={`absolute top-0 h-full rounded ${
                          isPositive ? "bg-red-400" : "bg-green-400"
                        }`}
                        style={{
                          width: `${barWidth}%`,
                          left: isPositive ? "0%" : undefined,
                          right: !isPositive ? "0%" : undefined,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-mono">
                      {isPositive ? "+" : ""}
                      {factor.contribution.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 유사 사기 사례 */}
      {result.similarCases.length > 0 && (
        <div className="mx-4 mb-4">
          <h4 className="mb-2 text-sm font-semibold opacity-70">
            인근 전세사기 피해사례
          </h4>
          <div className="space-y-1">
            {result.similarCases.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-xs dark:bg-gray-800"
              >
                <span className="truncate">{c.address}</span>
                <div className="flex items-center gap-2">
                  <span className="text-red-500">{c.caseType}</span>
                  <span className="opacity-50">{c.distance}km</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 권고사항 */}
      <div className="mx-4 mb-4 rounded bg-blue-50 p-3 text-xs dark:bg-blue-950/30">
        {result.recommendation}
      </div>
    </Card>
  );
}
