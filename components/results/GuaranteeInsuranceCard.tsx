"use client";

import { useState } from "react";
import { ShieldCheck, ExternalLink, Lightbulb, CheckCircle, XCircle, AlertTriangle, Copy, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { Card } from "@/components/common/Card";
import { cn, formatKRW } from "@/lib/utils";
import type { GuaranteeInsuranceResult, EligibilityStatus } from "@/lib/guarantee-insurance";
import type { JeonseFormData } from "@/app/(app)/jeonse/analysis/types";

interface GuaranteeInsuranceCardProps {
  result: GuaranteeInsuranceResult;
  formData?: JeonseFormData;
}

const STATUS_CONFIG: Record<EligibilityStatus, { label: string; bg: string; color: string; icon: typeof CheckCircle }> = {
  eligible:    { label: "가입 가능",  bg: "bg-emerald-100", color: "text-emerald-700", icon: CheckCircle  },
  conditional: { label: "조건부",     bg: "bg-amber-100",   color: "text-amber-700",   icon: AlertTriangle },
  ineligible:  { label: "가입 불가",  bg: "bg-red-100",     color: "text-red-700",     icon: XCircle       },
};

const PROVIDER_DOCS: Record<string, string[]> = {
  HUG: ["임대차계약서 사본", "주민등록등본", "전입세대확인서", "건물 등기부등본"],
  HF:  ["임대차계약서 사본", "주민등록등본", "건물 등기부등본", "주택 가격 확인 서류"],
  SGI: ["임대차계약서 사본", "주민등록등본", "건물 등기부등본"],
};

export function GuaranteeInsuranceCard({ result, formData }: GuaranteeInsuranceCardProps) {
  const [openProvider, setOpenProvider] = useState<string | null>(null);

  const jeonseRatio = formData && formData.propertyPrice > 0
    ? ((formData.deposit / formData.propertyPrice) * 100).toFixed(1)
    : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

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
          const isOpen = openProvider === r.provider;
          const docs = PROVIDER_DOCS[r.provider] ?? [];

          return (
            <div key={r.provider} className="border border-[#e5e5e7] rounded-lg overflow-hidden">
              <div className="p-4">
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
                    <span className="text-xs text-[#6e6e73] ml-1">(연 {r.premiumRate.toFixed(3)}%)</span>
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

                {/* 신청 준비 버튼 */}
                {r.status !== "ineligible" && (
                  <button
                    onClick={() => setOpenProvider(isOpen ? null : r.provider)}
                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-primary bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <ClipboardList size={12} strokeWidth={2} />
                    신청 준비하기
                    {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                )}
              </div>

              {/* 스마트 딥링크 패널 */}
              {r.status !== "ineligible" && isOpen && (
                <div className="border-t border-[#e5e5e7] bg-[#f9fafb] p-4 space-y-4">
                  {/* 입력 정보 요약 */}
                  {formData && (
                    <div>
                      <p className="text-xs font-semibold text-[#3c3c43] mb-2">신청 시 입력할 정보</p>
                      <div className="space-y-1.5">
                        {[
                          { label: "부동산 주소", value: formData.propertyAddress || "미입력" },
                          { label: "보증금",      value: formatKRW(formData.deposit) },
                          { label: "전세가율",    value: jeonseRatio ? `${jeonseRatio}%` : "미산출" },
                          { label: "선순위 채권", value: formData.seniorLiens > 0 ? formatKRW(formData.seniorLiens) : "없음" },
                          { label: "계약기간",    value: `${formData.startDate} ~ ${formData.endDate}` },
                          { label: "예상 보증료", value: formatKRW(r.estimatedPremium) },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-[#6e6e73] shrink-0 w-24">{label}</span>
                            <span className="font-medium text-[#1d1d1f] flex-1 truncate">{value}</span>
                            <button
                              onClick={() => copyToClipboard(value)}
                              className="shrink-0 text-[#6e6e73] hover:text-primary transition-colors"
                              title="복사"
                            >
                              <Copy size={11} strokeWidth={2} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 필요 서류 */}
                  {docs.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#3c3c43] mb-2">준비 서류</p>
                      <ul className="space-y-1">
                        {docs.map((doc) => (
                          <li key={doc} className="text-xs text-[#6e6e73] flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-[#6e6e73] shrink-0" />
                            {doc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 신청 페이지 이동 */}
                  <a
                    href={r.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-md bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    {r.provider} 신청 페이지 열기
                    <ExternalLink size={11} strokeWidth={2.5} />
                  </a>
                </div>
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
