"use client";

import { AlertTriangle } from "lucide-react";

interface AiDisclaimerProps {
  className?: string;
  compact?: boolean;
}

export default function AiDisclaimer({ className = "", compact = false }: AiDisclaimerProps) {
  if (compact) {
    return (
      <p className={`text-[10px] text-gray-400 flex items-center gap-1 ${className}`}>
        <AlertTriangle size={10} className="flex-shrink-0" />
        AI 생성 참고 자료이며, 전문가 자문을 대체하지 않습니다.
      </p>
    );
  }

  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50/50 p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">
          <p className="font-medium">AI 분석 면책조항</p>
          <p className="mt-1 text-amber-700">
            본 분석 결과는 AI가 생성한 참고 자료이며, 법률·세무·투자 자문을 대체하지 않습니다.
            중요한 의사결정 시 반드시 전문가와 상담하시기 바랍니다.
          </p>
        </div>
      </div>
    </div>
  );
}
