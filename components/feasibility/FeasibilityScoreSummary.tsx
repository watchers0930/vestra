"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Shield, TrendingUp } from "lucide-react";
import type { FeasibilityScore, ChapterOpinion } from "@/lib/feasibility/feasibility-types";
import { RATIONALITY_LABELS, RATIONALITY_COLORS } from "@/lib/feasibility/feasibility-types";

interface FeasibilityScoreSummaryProps {
  score: FeasibilityScore;
  chapters: ChapterOpinion[];
}

const GRADE_CONFIG: Record<string, { color: string; bg: string; ring: string; text: string }> = {
  A: { color: "text-emerald-600", bg: "bg-emerald-500", ring: "ring-emerald-200", text: "emerald" },
  B: { color: "text-blue-600", bg: "bg-blue-500", ring: "ring-blue-200", text: "blue" },
  C: { color: "text-amber-600", bg: "bg-amber-500", ring: "ring-amber-200", text: "amber" },
  D: { color: "text-orange-600", bg: "bg-orange-500", ring: "ring-orange-200", text: "orange" },
  F: { color: "text-red-600", bg: "bg-red-500", ring: "ring-red-200", text: "red" },
};

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

export function FeasibilityScoreSummary({ score, chapters }: FeasibilityScoreSummaryProps) {
  const riskChapters = chapters.filter((ch) => ch.riskHighlight);
  const gradeConf = GRADE_CONFIG[score.grade] || GRADE_CONFIG.C;
  const color = getScoreColor(score.score);
  const circumference = 2 * Math.PI * 56;
  const progress = (score.score / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* Hero Score Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 md:p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10">
          {/* Score Gauge */}
          <div className="flex flex-col items-center shrink-0">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="56" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle
                cx="70" cy="70" r="56" fill="none" stroke={color} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                transform="rotate(-90 70 70)"
                className="transition-all duration-1000 ease-out"
                style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
              />
              <text x="70" y="64" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">{score.score}</text>
              <text x="70" y="84" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11">V-Score</text>
            </svg>
            <div className={cn(
              "mt-2 px-4 py-1.5 rounded-full text-sm font-bold text-white",
              gradeConf.bg
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
                      <span className="text-xs text-gray-400">{item.category}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${barColor}25`, color: barColor }}
                        >
                          {RATIONALITY_LABELS[item.grade]}
                        </span>
                        <span className="text-xs text-gray-500 font-mono w-8 text-right">
                          {(item.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
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
              <div className="bg-white/5 backdrop-blur rounded-xl p-3.5 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp size={12} className="text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">투자 의견</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
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
