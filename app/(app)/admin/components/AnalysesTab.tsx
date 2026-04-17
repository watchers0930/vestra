"use client";

import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Badge } from "@/components/common";
import { ANALYSIS_TYPE_LABELS } from "../constants";
import type { AnalysisItem } from "../types";

interface Props {
  analyses: AnalysisItem[];
  filteredAnalyses: AnalysisItem[];
  analysisTypeFilter: string;
  setAnalysisTypeFilter: (v: string) => void;
}

export function AnalysesTab({ analyses, filteredAnalyses, analysisTypeFilter, setAnalysisTypeFilter }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {["ALL", ...Object.keys(ANALYSIS_TYPE_LABELS)].map((t) => (
          <button
            key={t}
            onClick={() => setAnalysisTypeFilter(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              analysisTypeFilter === t
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {t === "ALL" ? "전체" : ANALYSIS_TYPE_LABELS[t]}
            {" "}({t === "ALL" ? analyses.length : analyses.filter((a) => a.type === t).length})
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">사용자</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">유형</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">주소</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">요약</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">날짜</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAnalyses.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.user.name || "이름 없음"}</p>
                    <p className="text-xs text-gray-500">{item.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="info" size="md">
                      {item.typeLabel || ANALYSIS_TYPE_LABELS[item.type] || item.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{item.address}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[300px] truncate">{item.summary}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAnalyses.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            <FileText size={40} strokeWidth={1.5} className="mx-auto text-gray-300 mb-3" />
            분석 이력이 없습니다
          </div>
        )}
      </Card>
    </div>
  );
}
