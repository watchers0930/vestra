"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Shield, TrendingUp } from "lucide-react";
import { ScoreGauge } from "@/components/results/ScoreGauge";
import type { FeasibilityScore, ChapterOpinion } from "@/lib/feasibility/feasibility-types";
import { RATIONALITY_LABELS, RATIONALITY_COLORS } from "@/lib/feasibility/feasibility-types";

interface FeasibilityScoreSummaryProps {
  score: FeasibilityScore;
  chapters: ChapterOpinion[];
}

const GRADE_CONFIG: Record<string, { color: string; bg: string; text: string }> = {
  A: { color: "text-emerald-600", bg: "bg-emerald-50", text: "emerald" },
  B: { color: "text-blue-600", bg: "bg-blue-50", text: "blue" },
  C: { color: "text-amber-600", bg: "bg-amber-50", text: "amber" },
  D: { color: "text-orange-600", bg: "bg-orange-50", text: "orange" },
  F: { color: "text-red-600", bg: "bg-red-50", text: "red" },
};

export function FeasibilityScoreSummary({ score, chapters }: FeasibilityScoreSummaryProps) {
  const riskChapters = chapters.filter((ch) => ch.riskHighlight);
  const gradeConf = GRADE_CONFIG[score.grade] || GRADE_CONFIG.C;

  return (
    <div className="space-y-4">
      {/* Hero Score Section — Apple-style light card */}
      <div className="rounded-2xl border border-[#e5e5e7] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 p-6 md:p-8">
          {/* Score Gauge — 공용 컴포넌트 재사용 */}
          <div className="flex flex-col items-center shrink-0">
            <ScoreGauge
              score={score.score}
              size="lg"
              label="V-Score"
              grade={score.grade}
              scoreType="feasibility"
            />
            <div className={cn(
              "mt-3 px-4 py-1.5 rounded-full text-sm font-bold",
              gradeConf.color, gradeConf.bg
            )}>
              {score.grade}등급 · {score.gradeLabel}
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1 w-full space-y-4">
            {/* Breakdown bars */}
            <div className="space-y-2.5">
              {score.breakdown.map((item) => {
                const barColor = RATIONALITY_COLORS[item.grade];
                const percent = Math.min(100, item.score);
                return (
                  <div key={item.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#6e6e73]">{item.category}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${barColor}18`, color: barColor }}
                        >
                          {RATIONALITY_LABELS[item.grade]}
                        </span>
                        <span className="text-xs text-[#6e6e73] font-mono w-8 text-right">
                          {(item.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#f5f5f7] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${percent}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Investment Opinion */}
            {score.investmentOpinion && (
              <div className="bg-[#f5f5f7] rounded-xl p-3.5 border border-[#e5e5e7]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp size={12} className="text-[#6e6e73]" />
                  <span className="text-[10px] font-medium text-[#6e6e73] uppercase tracking-wider">투자 의견</span>
                </div>
                <p className="text-xs text-[#424245] leading-relaxed line-clamp-3">
                  {score.investmentOpinion}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Risk Highlights */}
      {riskChapters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {riskChapters.map((ch) => (
            <div
              key={ch.chapterId}
              className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100"
            >
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Ch.{ch.chapterId} {ch.title}
                </p>
                <p className="text-xs text-red-600 mt-0.5 line-clamp-2">{ch.summary}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <Shield size={16} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700">리스크 경고 없음</p>
            <p className="text-xs text-emerald-600">모든 장에서 중대 리스크가 감지되지 않았습니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
