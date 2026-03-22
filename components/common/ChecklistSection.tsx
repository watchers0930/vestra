"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ClipboardCheck,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/common";
import type { ChecklistItem } from "@/lib/checklist-generator";

// ─── 우선순위 뱃지 스타일 ───

const PRIORITY_STYLES: Record<
  ChecklistItem["priority"],
  { bg: string; text: string; label: string }
> = {
  required: {
    bg: "bg-red-100",
    text: "text-red-700",
    label: "필수",
  },
  recommended: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "권장",
  },
  optional: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    label: "선택",
  },
};

// ─── 컴포넌트 ───

interface ChecklistSectionProps {
  checklistByCategory: Record<string, ChecklistItem[]>;
}

export function ChecklistSection({ checklistByCategory }: ChecklistSectionProps) {
  const categories = Object.keys(checklistByCategory);
  const totalItems = Object.values(checklistByCategory).flat().length;

  // 카테고리별 펼침 상태
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => Object.fromEntries(categories.map((cat) => [cat, true]))
  );

  // 체크 상태 (name 기반)
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const checkedCount = Object.values(checked).filter(Boolean).length;

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleChecked = (name: string) => {
    setChecked((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <Card className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardCheck size={18} strokeWidth={1.5} className="text-[#1d1d1f]" />
          맞춤 준비 체크리스트
        </h2>
        <span className="text-xs text-gray-400">
          {checkedCount} / {totalItems} 완료
        </span>
      </div>

      {/* 진행률 바 */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
        />
      </div>

      {/* 카테고리별 섹션 */}
      <div className="space-y-3">
        {categories.map((category) => {
          const items = checklistByCategory[category];
          const isOpen = openCategories[category];
          const catChecked = items.filter((it) => checked[it.name]).length;

          return (
            <div
              key={category}
              className="border border-[#e5e5e7] rounded-lg overflow-hidden"
            >
              {/* 카테고리 헤더 */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CircleDot size={14} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-800">{category}</span>
                  <span className="text-[10px] text-gray-400">
                    {catChecked}/{items.length}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp size={14} className="text-gray-400" />
                ) : (
                  <ChevronDown size={14} className="text-gray-400" />
                )}
              </button>

              {/* 아이템 목록 */}
              {isOpen && (
                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const priority = PRIORITY_STYLES[item.priority];
                    const isChecked = !!checked[item.name];

                    return (
                      <div
                        key={item.name}
                        className={cn(
                          "px-4 py-3 flex items-start gap-3 transition-colors",
                          isChecked && "bg-gray-50"
                        )}
                      >
                        {/* 체크박스 */}
                        <button
                          onClick={() => toggleChecked(item.name)}
                          className={cn(
                            "mt-0.5 flex-shrink-0 w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all",
                            isChecked
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-gray-300 hover:border-gray-400"
                          )}
                          style={{ width: 18, height: 18 }}
                        >
                          {isChecked && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path
                                d="M1 4L3.5 6.5L9 1"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>

                        {/* 내용 */}
                        <div className={cn("flex-1 min-w-0", isChecked && "opacity-50")}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                "text-sm font-medium",
                                isChecked ? "line-through text-gray-400" : "text-gray-900"
                              )}
                            >
                              {item.name}
                            </span>
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                                priority.bg,
                                priority.text
                              )}
                            >
                              {priority.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-[11px] text-gray-400">
                              발급처: {item.where}
                            </span>
                            {item.cost && (
                              <span className="text-[11px] text-gray-400">
                                비용: {item.cost}
                              </span>
                            )}
                            {item.online && item.onlineUrl && (
                              <a
                                href={item.onlineUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                <ExternalLink size={10} />
                                온라인 발급
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
