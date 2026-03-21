"use client";

import { FileText } from "lucide-react";

interface FeasibilityReportPreviewProps {
  html: string;
}

export function FeasibilityReportPreview({ html }: FeasibilityReportPreviewProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#f5f5f7] flex items-center justify-center">
          <FileText size={16} className="text-[#1d1d1f]" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1d1d1f]">보고서 미리보기</h3>
          <p className="text-xs text-[#86868b]">새 창에서 열어 인쇄 메뉴로 PDF 저장이 가능합니다</p>
        </div>
      </div>
      <div className="p-4">
        <iframe
          title="사업성 분석 보고서 미리보기"
          srcDoc={html}
          className="h-[720px] w-full rounded-xl border border-gray-200 bg-white"
        />
      </div>
    </div>
  );
}
