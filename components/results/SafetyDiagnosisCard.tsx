"use client";

import { useState } from "react";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardContent, Badge } from "@/components/common";
import type { SafetyDiagnosisResult, DiagnosisItem } from "@/lib/safety-diagnosis";

// ─── 상태별 아이콘/색상 ───

const STATUS_CONFIG: Record<
  DiagnosisItem["status"],
  { icon: typeof CheckCircle2; color: string; bgColor: string; label: string }
> = {
  pass: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    label: "안전",
  },
  warn: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    label: "주의",
  },
  fail: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    label: "위험",
  },
  unknown: {
    icon: HelpCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    label: "확인필요",
  },
  info: {
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    label: "안내",
  },
};

const OVERALL_CONFIG = {
  safe: { label: "안전", variant: "success" as const, color: "text-emerald-600" },
  caution: { label: "주의 필요", variant: "warning" as const, color: "text-amber-600" },
  danger: { label: "위험 감지", variant: "danger" as const, color: "text-red-600" },
};

// ─── 개별 진단 항목 ───

function DiagnosisRow({ item }: { item: DiagnosisItem }) {
  const [expanded, setExpanded] = useState(item.status === "fail" || item.status === "warn");
  const config = STATUS_CONFIG[item.status];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${item.status === "fail" ? "border-red-200" : "border-gray-100"}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <div className={`p-1.5 rounded-full ${config.bgColor}`}>
          <Icon size={16} strokeWidth={1.5} className={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{item.label}</span>
            <Badge
              variant={item.status === "pass" ? "success" : item.status === "fail" ? "danger" : item.status === "warn" ? "warning" : item.status === "info" ? "info" : "neutral"}
              size="sm"
            >
              {config.label}
            </Badge>
          </div>
          <p className="text-xs text-muted mt-0.5 truncate">{item.description}</p>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-muted shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-muted shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* 상세 설명 */}
          <div className="text-sm text-secondary pl-10">
            {item.description}
          </div>

          {/* 행동 안내 */}
          {item.action && item.action !== "추가 확인 불필요" && (
            <div className="ml-10 p-2.5 rounded-lg bg-blue-50 text-xs text-blue-800">
              <span className="font-medium">필요한 조치: </span>
              {item.action}
            </div>
          )}

          {/* 근거 */}
          {item.evidence && item.evidence.length > 0 && (
            <div className="ml-10 space-y-1">
              <p className="text-[10px] font-medium text-muted">근거</p>
              {item.evidence.map((e, i) => (
                <div key={i} className="text-[11px] text-muted pl-2 border-l-2 border-gray-200">
                  {e}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ───

interface SafetyDiagnosisCardProps {
  result: SafetyDiagnosisResult;
}

export default function SafetyDiagnosisCard({ result }: SafetyDiagnosisCardProps) {
  const overall = OVERALL_CONFIG[result.overallStatus];

  return (
    <Card>
      <div className="h-5" />
      <CardHeader title="8대 안전진단">
        <Badge variant={overall.variant} size="md">
          {overall.label}
        </Badge>
      </CardHeader>
      <CardContent>
        {/* 요약 통계 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span className="text-emerald-700 font-medium">{result.passCount}건 안전</span>
            </div>
            {result.warnCount > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-600" />
                <span className="text-amber-700 font-medium">{result.warnCount}건 주의</span>
              </div>
            )}
            {result.failCount > 0 && (
              <div className="flex items-center gap-1.5">
                <XCircle size={14} className="text-red-600" />
                <span className="text-red-700 font-medium">{result.failCount}건 위험</span>
              </div>
            )}
            {result.unknownCount > 0 && (
              <div className="flex items-center gap-1.5">
                <HelpCircle size={14} className="text-gray-500" />
                <span className="text-gray-600 font-medium">{result.unknownCount}건 확인필요</span>
              </div>
            )}
            {result.infoCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Info size={14} className="text-blue-500" />
                <span className="text-blue-600 font-medium">{result.infoCount}건 안내</span>
              </div>
            )}
          </div>
        </div>

        {/* 진단 항목 목록 — fail → warn → unknown → pass 순 */}
        <div className="space-y-2">
          {result.items
            .sort((a, b) => {
              const order: Record<string, number> = { fail: 0, warn: 1, unknown: 2, info: 3, pass: 4 };
              return order[a.status] - order[b.status];
            })
            .map((item) => (
              <DiagnosisRow key={item.id} item={item} />
            ))}
        </div>

        {/* 안내 문구 */}
        <div className="mt-4 rounded-lg bg-[#f5f5f7] p-3 text-xs text-muted flex items-start gap-2">
          <Shield size={14} strokeWidth={1.5} className="text-[#1d1d1f] mt-0.5 shrink-0" />
          <span>
            8대 안전진단은 유튜브 &ldquo;깨끗한 등기부등본 세 번 확인하고도 4억 날린 사건&rdquo;에서 추출한
            핵심 확인 항목입니다. 모든 항목을 통과하더라도 전문가 상담을 권고합니다.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
