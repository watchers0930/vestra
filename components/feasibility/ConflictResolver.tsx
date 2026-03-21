"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent } from "@/components/common";
import { AlertTriangle, Check } from "lucide-react";
import type { DataConflict, ResolvedConflict } from "@/lib/feasibility/feasibility-types";
import { CLAIM_LABELS, type ClaimKey } from "@/lib/feasibility/feasibility-types";

interface ConflictResolverProps {
  conflicts: DataConflict[];
  onResolve: (resolved: ResolvedConflict[]) => void;
}

function formatValue(value: number, field: string): string {
  if (field.includes("rate") || field.includes("ratio") || field.includes("coverage")) {
    return `${value.toLocaleString()}%`;
  }
  if (field.includes("area")) {
    return `${value.toLocaleString()} ㎡`;
  }
  if (field.includes("units")) {
    return `${value.toLocaleString()} 세대`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toLocaleString()} 억원`;
  }
  return `${value.toLocaleString()} 만원`;
}

export function ConflictResolver({ conflicts, onResolve }: ConflictResolverProps) {
  const [selections, setSelections] = useState<Record<string, "A" | "B">>({});

  const allResolved = Object.keys(selections).length === conflicts.length;

  const handleSelect = useCallback(
    (field: string, side: "A" | "B") => {
      setSelections((prev) => ({ ...prev, [field]: side }));
    },
    []
  );

  const handleConfirm = useCallback(() => {
    const resolved: ResolvedConflict[] = conflicts.map((c) => {
      const side = selections[c.field] || "A";
      return {
        field: c.field,
        selectedFile: side === "A" ? c.fileA : c.fileB,
        selectedValue: side === "A" ? c.valueA : c.valueB,
      };
    });
    onResolve(resolved);
  }, [conflicts, selections, onResolve]);

  if (!conflicts.length) return null;

  return (
    <Card>
      <CardHeader
        title={`문서 간 수치 불일치 (${conflicts.length}건)`}
        description="여러 파일에서 동일 항목의 수치가 다릅니다. 분석에 사용할 값을 선택해주세요."
      >
        <AlertTriangle size={18} className="text-amber-500" strokeWidth={1.5} />
      </CardHeader>
      <CardContent className="space-y-3">
        {conflicts.map((conflict) => {
          const selected = selections[conflict.field];
          const label =
            CLAIM_LABELS[conflict.field as ClaimKey] || conflict.field;

          return (
            <div
              key={conflict.field}
              className="border border-[#e5e5e7] rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#1d1d1f]">
                  {label}
                </span>
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  괴리율 {conflict.deviation.toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 파일 A */}
                <button
                  onClick={() => handleSelect(conflict.field, "A")}
                  className={cn(
                    "relative border rounded-lg p-3 text-left transition-all",
                    selected === "A"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-[#e5e5e7] hover:border-primary/50"
                  )}
                >
                  {selected === "A" && (
                    <Check
                      size={14}
                      className="absolute top-2 right-2 text-primary"
                    />
                  )}
                  <p className="text-xs text-[#6e6e73] truncate">
                    {conflict.fileA}
                  </p>
                  <p className="text-lg font-semibold text-[#1d1d1f] mt-1">
                    {formatValue(conflict.valueA, conflict.field)}
                  </p>
                </button>

                {/* 파일 B */}
                <button
                  onClick={() => handleSelect(conflict.field, "B")}
                  className={cn(
                    "relative border rounded-lg p-3 text-left transition-all",
                    selected === "B"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-[#e5e5e7] hover:border-primary/50"
                  )}
                >
                  {selected === "B" && (
                    <Check
                      size={14}
                      className="absolute top-2 right-2 text-primary"
                    />
                  )}
                  <p className="text-xs text-[#6e6e73] truncate">
                    {conflict.fileB}
                  </p>
                  <p className="text-lg font-semibold text-[#1d1d1f] mt-1">
                    {formatValue(conflict.valueB, conflict.field)}
                  </p>
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={handleConfirm}
          disabled={!allResolved}
          className={cn(
            "w-full rounded-xl font-medium border transition-colors flex items-center justify-center gap-2 px-4 py-2.5 text-sm",
            allResolved
              ? "bg-primary text-white hover:bg-primary/90 border-transparent"
              : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
          )}
        >
          <Check size={16} />
          선택 완료 ({Object.keys(selections).length}/{conflicts.length})
        </button>
      </CardContent>
    </Card>
  );
}
