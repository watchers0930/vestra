"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import type { ChapterOpinion } from "@/lib/feasibility/feasibility-types";
import { RATIONALITY_LABELS, RATIONALITY_COLORS } from "@/lib/feasibility/feasibility-types";

interface ChapterReviewProps {
  chapter: ChapterOpinion;
  defaultOpen?: boolean;
}

export function ChapterReview({ chapter, defaultOpen = false }: ChapterReviewProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || chapter.riskHighlight);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white shadow-sm overflow-hidden transition-colors",
        chapter.riskHighlight ? "border-red-200" : "border-gray-100"
      )}
    >
      {/* Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        {/* Chapter number badge */}
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold",
            chapter.riskHighlight
              ? "bg-red-100 text-red-600"
              : "bg-primary/10 text-primary"
          )}
        >
          {chapter.chapterId}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#1d1d1f] truncate">
            {chapter.title}
          </h3>
          {!isOpen && chapter.summary && (
            <p className="text-xs text-[#6e6e73] truncate mt-0.5">{chapter.summary}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {chapter.riskHighlight && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
              <AlertTriangle size={11} />
              리스크
            </span>
          )}
          <ChevronDown
            size={16}
            className={cn(
              "text-gray-400 transition-transform duration-300",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
          {/* Summary */}
          {chapter.summary && (
            <p className="text-sm text-[#424245] leading-relaxed pt-4">{chapter.summary}</p>
          )}

          {/* Data Table */}
          {chapter.dataTable.length > 0 && (
            <div className="rounded-xl bg-gray-50/80 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {chapter.dataTable.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100/80 last:border-0">
                      <td className="py-2.5 px-4 text-[#6e6e73]">{row.label}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-[#1d1d1f] tabular-nums">
                        {row.value} {row.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Verification Details */}
          {chapter.verificationDetails.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">검증 상세</p>
              {chapter.verificationDetails.map((detail, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div
                    className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: RATIONALITY_COLORS[detail.grade] }}
                  />
                  <div className="text-xs">
                    <span className="font-medium text-[#1d1d1f]">{detail.claim}</span>
                    <span
                      className="ml-1.5 font-semibold px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        backgroundColor: `${RATIONALITY_COLORS[detail.grade]}18`,
                        color: RATIONALITY_COLORS[detail.grade],
                      }}
                    >
                      {RATIONALITY_LABELS[detail.grade]}
                    </span>
                    <p className="text-[#6e6e73] mt-0.5 leading-relaxed">{detail.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SCR Review Opinion */}
          {chapter.overallReview && (
            <div
              className={cn(
                "rounded-xl p-4",
                chapter.riskHighlight
                  ? "bg-red-50/80 border border-red-100"
                  : "bg-blue-50/80 border border-blue-100"
              )}
            >
              <div className="flex items-center gap-1.5 mb-2">
                {chapter.riskHighlight ? (
                  <AlertTriangle size={13} className="text-red-500" />
                ) : (
                  <CheckCircle2 size={13} className="text-primary" />
                )}
                <span className="text-[11px] font-bold text-[#1d1d1f] uppercase tracking-wider">
                  검토 의견
                </span>
              </div>
              <p className="text-sm text-[#424245] leading-relaxed">
                {chapter.overallReview}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
