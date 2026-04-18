"use client";

import { FileText, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisRecord } from "@/lib/store";
import { typeIcons, typeColors } from "../constants";

interface Props {
  analyses: AnalysisRecord[];
  addressCountMap: Record<string, number>;
  cascadeLoading: string | null;
  handleCascadeUpdate: (address: string) => void;
  handleDeleteAnalysis: (id: string) => void;
}

export function AnalysisHistory({ analyses, addressCountMap, cascadeLoading, handleCascadeUpdate, handleDeleteAnalysis }: Props) {
  if (analyses.length === 0) return null;

  return (
    <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#1d1d1f]">최근 분석 내역</h2>
          <p className="text-xs text-[#6e6e73] mt-0.5">AI 분석 리포트 히스토리</p>
        </div>
        <span className="text-xs text-[#6e6e73]">{analyses.length}건</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="py-3 px-5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">유형</th>
              <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">대상</th>
              <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">분석 요약</th>
              <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">날짜</th>
              <th className="py-3 px-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {analyses.slice(0, 10).map((item) => {
              const Icon = typeIcons[item.type] || FileText;
              const colors = typeColors[item.type] || { bg: "bg-gray-50", text: "text-gray-600" };
              return (
                <tr key={item.id} className={cn("group border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/50", cascadeLoading === item.address && "bg-primary/5")}>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", colors.bg)}>
                        <Icon className={cn("h-4 w-4", colors.text)} strokeWidth={1.5} />
                      </div>
                      <span className="text-sm font-medium text-[#1d1d1f]">{item.typeLabel}</span>
                      {cascadeLoading === item.address && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium">
                          <Loader2 size={10} className="animate-spin" />업데이트 중
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-[#424245] truncate max-w-[150px]">
                      {item.address}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="max-w-md truncate text-sm text-[#6e6e73]">{item.summary}</p>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-xs text-[#6e6e73]">{new Date(item.date).toLocaleDateString("ko-KR")}</span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {addressCountMap[item.address] >= 2 && (
                        <button
                          onClick={() => handleCascadeUpdate(item.address)}
                          disabled={cascadeLoading === item.address}
                          className="p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                          title="연관 분석 업데이트"
                        >
                          <RefreshCw size={14} className={cascadeLoading === item.address ? "animate-spin" : ""} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAnalysis(item.id)}
                        className="p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
