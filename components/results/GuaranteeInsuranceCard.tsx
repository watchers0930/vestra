"use client";

import { ShieldCheck, ExternalLink, Lightbulb, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/common/Card";
import { cn, formatKRW } from "@/lib/utils";
import type { GuaranteeInsuranceResult, EligibilityStatus } from "@/lib/guarantee-insurance";

interface GuaranteeInsuranceCardProps {
  result: GuaranteeInsuranceResult;
}

const STATUS_CONFIG: Record<EligibilityStatus, { label: string; bg: string; color: string; icon: typeof CheckCircle }> = {
  eligible: { label: "가입 가능", bg: "bg-emerald-100", color: "text-emerald-700", icon: CheckCircle },
  conditional: { label: "조건부", bg: "bg-amber-100", color: "text-amber-700", icon: AlertTriangle },
  ineligible: { label: "가입 불가", bg: "bg-red-100", color: "text-red-700", icon: XCircle },
};

export function GuaranteeInsuranceCard({ result }: GuaranteeInsuranceCardProps) {
  return (
    <Card className="p-5">
      <h4 className="font-semibold mb-4 flex items-center gap-2">
        <ShieldCheck size={18} className="text-[#1d1d1f]" strokeWidth={1.5} />
        보증보험 가입 가능성
      </h4>

      <div className="space-y-4">
        {result.results.map((r) => {
          const config = STATUS_CONFIG[r.status];
          const Icon = config.icon;

          return (
            <div key={r.provider} className="border border-[#e5e5e7] rounded-lg p-4">
              {/* 기관명 + 상태 배지 */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-sm">{r.provider}</span>
                  <span className="text-xs text-[#6e6e73] ml-1.5">{r.providerName}</span>
                </div>
                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1", config.bg, config.color)}>
                  <Icon size={12} strokeWidth={2} />
                  {config.label}
                </span>
              </div>

              {/* 예상 보증료 */}
              {r.status !== "ineligible" && (
                <p className="text-sm text-[#1d1d1f] mb-2">
                  예상 보증료: <span className="font-semibold">{formatKRW(r.estimatedPremium)}</span>
                  <span className="text-xs text-[#6e6e73] ml-1">(연 {(r.premiumRate).toFixed(3)}%)</span>
                </p>
              )}

              {/* 사유 목록 */}
              <ul className="space-y-1">
                {r.reasons.map((reason, i) => (
                  <li key={i} className="text-xs text-[#6e6e73] flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">•</span>
                    {reason}
                  </li>
                ))}
              </ul>

              {/* 해결 방안 */}
              {r.solutions.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {r.solutions.map((sol, i) => (
                    <li key={i} className="text-xs text-blue-600 flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">→</span>
                      {sol}
                    </li>
                  ))}
                </ul>
              )}

              {/* 신청 링크 */}
              {r.status !== "ineligible" && (
                <a
                  href={r.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                >
                  신청 바로가기
                  <ExternalLink size={10} strokeWidth={2} />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* 추천 */}
      {result.recommendation && (
        <div className="mt-4 px-3 py-2.5 bg-blue-50 rounded-lg flex items-start gap-2">
          <Lightbulb size={16} className="text-blue-600 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-xs text-blue-700">
            <span className="font-semibold">추천: {result.recommendation.provider}</span>
            {" — "}
            {result.recommendation.reason}
          </p>
        </div>
      )}

      {/* 면책 */}
      <p className="mt-3 text-[10px] text-[#8e8e93] leading-relaxed">
        판단 기준일: {result.checkedAt} | {result.disclaimer}
      </p>
    </Card>
  );
}
