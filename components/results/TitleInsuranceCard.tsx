"use client";

import {
  Shield,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardContent, Badge } from "@/components/common";
import type { TitleInsuranceResult } from "@/lib/title-insurance";

// ─── 권고 등급 설정 ───

const REC_CONFIG: Record<
  string,
  { variant: "danger" | "warning" | "info"; label: string; bgColor: string }
> = {
  required: { variant: "danger", label: "강력 권고", bgColor: "bg-red-50" },
  recommended: { variant: "warning", label: "권장", bgColor: "bg-amber-50" },
  optional: { variant: "info", label: "선택", bgColor: "bg-blue-50" },
};

function formatPrice(value: number): string {
  if (value >= 10_000) return `${Math.round(value / 10_000)}만원`;
  return `${value.toLocaleString()}원`;
}

// ─── 메인 컴포넌트 ───

interface TitleInsuranceCardProps {
  result: TitleInsuranceResult;
}

export default function TitleInsuranceCard({ result }: TitleInsuranceCardProps) {
  const recConfig = REC_CONFIG[result.recommendation] || REC_CONFIG.optional;

  return (
    <Card>
      <div className="h-5" />
      <CardHeader title="권원보험 안내">
        <Badge variant={recConfig.variant} size="md">
          {recConfig.label}
        </Badge>
      </CardHeader>
      <CardContent>
        {/* 권고 사유 */}
        <div className={`rounded-lg p-3 mb-4 ${recConfig.bgColor}`}>
          <div className="flex items-start gap-2">
            <Shield size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            <p className="text-sm">{result.recommendationReason}</p>
          </div>
        </div>

        {/* 예상 보험료 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-gray-50">
            <p className="text-lg font-bold">{formatPrice(result.premium.estimatedPremium)}</p>
            <p className="text-xs text-muted mt-1">예상 보험료</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-50">
            <p className="text-lg font-bold">{result.premium.premiumRate.toFixed(2)}%</p>
            <p className="text-xs text-muted mt-1">요율</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-50 col-span-2 md:col-span-1">
            <p className="text-sm font-medium">
              {formatPrice(result.premium.premiumRange.min)} ~ {formatPrice(result.premium.premiumRange.max)}
            </p>
            <p className="text-xs text-muted mt-1">보험료 범위</p>
          </div>
        </div>

        {/* 보장 범위 */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">보장 범위</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {result.coverageItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 text-sm"
              >
                <CheckCircle2 size={14} strokeWidth={1.5} className="text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">{item.name}</span>
                  <p className="text-xs text-muted">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 보험사 목록 */}
        <div>
          <p className="text-sm font-medium mb-2">문의 가능 기관</p>
          <div className="space-y-2">
            {result.providers.map((provider) => (
              <div
                key={provider.name}
                className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium">{provider.name}</p>
                  <p className="text-xs text-muted">{provider.description}</p>
                </div>
                {provider.website && (
                  <a
                    href={provider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                  >
                    방문
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 면책 */}
        <p className="mt-4 text-[10px] text-muted text-center">
          예상 보험료는 참고용이며, 실제 보험료는 보험사 심사 후 확정됩니다.
          VESTRA는 보험 중개·판매를 하지 않습니다.
        </p>
      </CardContent>
    </Card>
  );
}
