"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  SCR_CLAIM_CATEGORIES,
  SCR_CLAIM_LABELS,
  SCR_CLAIM_UNITS,
  type ScrClaimKey,
  type ScrClaimCategory,
} from "@/lib/feasibility/scr-claim-keys";
import type { ParsedClaimItem } from "./ScrReportWizard";

interface ScrDataReviewStepProps {
  items: ParsedClaimItem[];
  onItemChange: (key: ScrClaimKey, value: string | number | null) => void;
}

/** 카테고리 한글 표시명 */
const CATEGORY_LABELS: Record<ScrClaimCategory, string> = {
  사업개요: "사업개요",
  분양가: "분양가",
  자금조달: "자금조달",
  공사비: "공사비",
  사업수지_수입: "사업수지 (수입)",
  사업수지_지출: "사업수지 (지출)",
  수익성: "수익성",
  토지: "토지",
  운영수익: "운영수익",
};

/** 신뢰도 뱃지 */
function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.8) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600">
        <CheckCircle2 size={10} />
        {Math.round(confidence * 100)}%
      </span>
    );
  }
  if (confidence >= 0.5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600">
        {Math.round(confidence * 100)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-500">
      <AlertCircle size={10} />
      {confidence > 0 ? `${Math.round(confidence * 100)}%` : "미감지"}
    </span>
  );
}

export function ScrDataReviewStep({ items, onItemChange }: ScrDataReviewStepProps) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(Object.keys(SCR_CLAIM_CATEGORIES))
  );

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const itemMap = new Map(items.map((it) => [it.key, it]));

  // 통계
  const totalKeys = Object.values(SCR_CLAIM_CATEGORIES).flat().length;
  const filledCount = items.filter((it) => it.value != null && it.value !== "").length;
  const lowConfCount = items.filter((it) => it.confidence < 0.5).length;

  return (
    <div className="space-y-5">
      {/* 상단 요약 */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-[#6e6e73]">
            감지됨 <strong className="text-[#1d1d1f]">{filledCount}</strong>/{totalKeys}
          </span>
        </div>
        {lowConfCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-[#6e6e73]">
              저신뢰 <strong className="text-amber-600">{lowConfCount}</strong>
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-xs text-[#6e6e73]">
            빈 값 <strong className="text-red-500">{totalKeys - filledCount}</strong>
          </span>
        </div>
      </div>

      {/* 카테고리별 아코디언 */}
      {(Object.entries(SCR_CLAIM_CATEGORIES) as [ScrClaimCategory, readonly ScrClaimKey[]][]).map(
        ([category, keys]) => {
          const isOpen = openCategories.has(category);
          const catItems = keys.map((k) => itemMap.get(k));
          const catFilled = catItems.filter((it) => it?.value != null && it.value !== "").length;

          return (
            <div
              key={category}
              className="rounded-xl border border-gray-100 overflow-hidden"
            >
              {/* 아코디언 헤더 */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-[#6e6e73] transition-transform",
                      !isOpen && "-rotate-90"
                    )}
                  />
                  <span className="text-sm font-semibold text-[#1d1d1f]">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="text-[10px] text-[#86868b] tabular-nums">
                    {catFilled}/{keys.length}
                  </span>
                </div>
                {catFilled < keys.length && (
                  <span className="text-[10px] font-medium text-amber-500">
                    {keys.length - catFilled}개 미입력
                  </span>
                )}
              </button>

              {/* 아코디언 본문 */}
              {isOpen && (
                <div className="divide-y divide-gray-50">
                  {keys.map((key) => {
                    const item = itemMap.get(key);
                    const label = SCR_CLAIM_LABELS[key] || key;
                    const unit = SCR_CLAIM_UNITS[key] || "";
                    const value = item?.value ?? "";
                    const confidence = item?.confidence ?? 0;
                    const isEmpty = value === "" || value === null;

                    return (
                      <div
                        key={key}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5",
                          isEmpty && "bg-red-50/30"
                        )}
                      >
                        {/* 라벨 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#1d1d1f] truncate">
                            {label}
                          </p>
                          {unit && (
                            <p className="text-[10px] text-[#86868b]">{unit}</p>
                          )}
                        </div>

                        {/* 신뢰도 뱃지 */}
                        <ConfidenceBadge confidence={confidence} />

                        {/* 수정 인풋 */}
                        <input
                          type="text"
                          value={value?.toString() ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            const numVal = Number(v);
                            onItemChange(
                              key,
                              v === "" ? null : !isNaN(numVal) && unit ? numVal : v
                            );
                          }}
                          placeholder={isEmpty ? "값 입력" : ""}
                          className={cn(
                            "w-40 px-3 py-1.5 rounded-lg border text-sm text-right tabular-nums font-medium",
                            "focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3]",
                            "transition-all",
                            isEmpty
                              ? "border-red-200 bg-white placeholder:text-red-300"
                              : "border-gray-200 bg-white text-[#1d1d1f]"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
      )}
    </div>
  );
}
