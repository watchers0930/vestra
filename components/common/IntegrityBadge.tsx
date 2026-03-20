"use client";

import { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, Hash, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 분석 무결성 검증 배지
 * API에서 반환된 실제 Merkle Root와 단계별 해시를 표시
 */

interface IntegrityStage {
  name: string;
  hash: string;
}

interface IntegrityData {
  merkleRoot: string;
  totalSteps: number;
  isValid: boolean;
  stages: IntegrityStage[];
}

interface Props {
  /** API에서 반환된 무결성 데이터 */
  data?: IntegrityData | null;
  /** 간소화 모드 */
  compact?: boolean;
  className?: string;
}

// 단계별 점진적 색상 (indigo 계열, 점점 진하게)
const STEP_COLORS = [
  "bg-indigo-200",
  "bg-indigo-300",
  "bg-indigo-400",
  "bg-indigo-500",
  "bg-indigo-600",
];

export function IntegrityBadge({ data, compact = false, className }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <ShieldCheck size={12} className={data.isValid ? "text-gray-500" : "text-red-500"} />
        <span className={cn("text-[10px] font-medium", data.isValid ? "text-gray-600" : "text-red-600")}>
          {data.isValid ? "무결성 검증됨" : "검증 실패"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-gray-50/50 overflow-hidden", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className={data.isValid ? "text-gray-500" : "text-red-500"} />
          <span className="text-xs font-medium text-gray-700">
            {data.isValid ? "분석 무결성 검증됨" : "무결성 검증 실패"}
          </span>
          <span className="px-1.5 py-0.5 text-[9px] bg-indigo-50 text-indigo-600 rounded font-medium">
            {data.totalSteps}단계 해시체인
          </span>
        </div>
        {expanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Merkle Root */}
          <div className="p-2 bg-white rounded border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Hash size={10} className="text-indigo-500" />
              <span className="text-[10px] font-medium text-gray-600">Merkle Root</span>
            </div>
            <p className="font-mono text-[9px] text-gray-500 break-all leading-relaxed">
              {data.merkleRoot}
            </p>
          </div>

          {/* 단계별 해시 */}
          <div className="space-y-1">
            {data.stages.map((stage, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STEP_COLORS[i % STEP_COLORS.length])} />
                <span className="text-[10px] text-gray-500 w-16 flex-shrink-0">{stage.name}</span>
                <span className="font-mono text-[9px] text-gray-400 truncate">{stage.hash}...</span>
                <CheckCircle size={10} className="text-gray-300 flex-shrink-0" />
              </div>
            ))}
          </div>

          {/* 단계 진행 바 */}
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${data.totalSteps}, 1fr)` }}>
            {data.stages.map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className={cn("w-full h-1.5 rounded-full", STEP_COLORS[i % STEP_COLORS.length])} />
                <span className="text-[8px] text-gray-400">단계{i + 1}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            각 분석 단계의 입출력이 SHA-256 해시로 연결되어 있으며, Merkle Tree로 전체 무결성이 검증되었습니다.
            이 해시값으로 분석 결과의 변조 여부를 독립적으로 확인할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
