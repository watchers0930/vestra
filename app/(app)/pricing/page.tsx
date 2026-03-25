"use client";

import { useState } from "react";
import { Check, X, Crown, Zap, Building2 } from "lucide-react";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { PageHeader } from "@/components/common/PageHeader";

type TierKey = "free" | "pro" | "business";

interface Tier {
  key: TierKey;
  name: string;
  price: string;
  period: string;
  description: string;
  icon: typeof Crown;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const tiers: Tier[] = [
  {
    key: "free",
    name: "무료",
    price: "0원",
    period: "",
    description: "부동산 분석을 처음 시작하는 분께",
    icon: Zap,
    features: ["일 3회 AI 분석", "기본 시세 조회", "전세 안전성 간이 체크", "커뮤니티 접근"],
    cta: "시작하기",
  },
  {
    key: "pro",
    name: "프로",
    price: "29,900원",
    period: "/월",
    description: "적극적으로 자산을 관리하는 투자자를 위해",
    icon: Crown,
    highlighted: true,
    features: [
      "무제한 AI 분석",
      "실시간 시세 알림",
      "PDF 리포트 다운로드",
      "전문가 상담 월 1회",
      "권리분석 상세 리포트",
      "세금 시뮬레이션",
    ],
    cta: "구독하기",
  },
  {
    key: "business",
    name: "비즈니스",
    price: "99,000원",
    period: "/월",
    description: "팀과 함께 사용하는 부동산 전문가를 위해",
    icon: Building2,
    features: [
      "프로 플랜 전체 포함",
      "REST API 접근",
      "다중 사용자 (최대 10명)",
      "전담 매니저 배정",
      "맞춤형 리포트 제작",
      "SLA 99.9% 보장",
    ],
    cta: "문의하기",
  },
];

interface ComparisonRow {
  feature: string;
  free: boolean | string;
  pro: boolean | string;
  business: boolean | string;
}

const comparison: ComparisonRow[] = [
  { feature: "AI 분석 횟수", free: "일 3회", pro: "무제한", business: "무제한" },
  { feature: "시세 조회", free: true, pro: true, business: true },
  { feature: "실시간 시세 알림", free: false, pro: true, business: true },
  { feature: "PDF 리포트", free: false, pro: true, business: true },
  { feature: "전문가 상담", free: false, pro: "월 1회", business: "무제한" },
  { feature: "권리분석 상세", free: false, pro: true, business: true },
  { feature: "세금 시뮬레이션", free: false, pro: true, business: true },
  { feature: "API 접근", free: false, pro: false, business: true },
  { feature: "다중 사용자", free: false, pro: false, business: "최대 10명" },
  { feature: "전담 매니저", free: false, pro: false, business: true },
  { feature: "맞춤형 리포트", free: false, pro: false, business: true },
  { feature: "SLA 보장", free: false, pro: false, business: "99.9%" },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
      <PageHeader
        icon={Crown}
        title="요금제"
        description="필요에 맞는 플랜을 선택하세요"
      />

      {/* 결제 주기 토글 */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm ${!annual ? "font-semibold text-gray-900" : "text-gray-500"}`}>
          월간 결제
        </span>
        <button
          onClick={() => setAnnual(!annual)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            annual ? "bg-indigo-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              annual ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className={`text-sm ${annual ? "font-semibold text-gray-900" : "text-gray-500"}`}>
          연간 결제
        </span>
        {annual && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            2개월 무료
          </span>
        )}
      </div>

      {/* 요금제 카드 */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <Card
              key={tier.key}
              hover
              className={`relative flex flex-col p-6 ${
                tier.highlighted
                  ? "border-indigo-300 ring-2 ring-indigo-600 shadow-lg"
                  : ""
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">
                  인기
                </div>
              )}

              <div className="mb-4 flex items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    tier.highlighted ? "bg-indigo-100" : "bg-gray-100"
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] ${
                      tier.highlighted ? "text-indigo-600" : "text-gray-600"
                    }`}
                  />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
              </div>

              <p className="mb-4 text-sm text-gray-500">{tier.description}</p>

              <div className="mb-6">
                <span className="text-3xl font-extrabold text-gray-900">
                  {tier.key === "free"
                    ? "0원"
                    : annual
                      ? tier.key === "pro"
                        ? "299,000원"
                        : "990,000원"
                      : tier.price}
                </span>
                {tier.key !== "free" && (
                  <span className="text-sm text-gray-500">
                    {annual ? "/년" : "/월"}
                  </span>
                )}
                {annual && tier.key !== "free" && (
                  <p className="mt-1 text-xs text-green-600 font-medium">
                    월 {tier.key === "pro" ? "약 24,917원" : "약 82,500원"} (2개월 무료)
                  </p>
                )}
              </div>

              <ul className="mb-6 flex-1 space-y-2.5">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                    {feat}
                  </li>
                ))}
              </ul>

              <Button
                variant={tier.highlighted ? "primary" : "secondary"}
                fullWidth
                size="lg"
                className={
                  tier.highlighted
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : ""
                }
              >
                {tier.cta}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* 기능 비교 테이블 */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">기능 비교</h2>
          <p className="mt-1 text-sm text-gray-500">플랜별 상세 기능을 비교해 보세요</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 text-left font-medium text-gray-500">기능</th>
                <th className="px-5 py-3 text-center font-medium text-gray-500">무료</th>
                <th className="px-5 py-3 text-center font-medium text-indigo-600">프로</th>
                <th className="px-5 py-3 text-center font-medium text-gray-500">비즈니스</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr
                  key={row.feature}
                  className={i < comparison.length - 1 ? "border-b border-gray-50" : ""}
                >
                  <td className="px-5 py-3 text-gray-700">{row.feature}</td>
                  {(["free", "pro", "business"] as TierKey[]).map((tier) => {
                    const val = row[tier];
                    return (
                      <td key={tier} className="px-5 py-3 text-center">
                        {typeof val === "boolean" ? (
                          val ? (
                            <Check className="mx-auto h-4 w-4 text-indigo-600" />
                          ) : (
                            <X className="mx-auto h-4 w-4 text-gray-300" />
                          )
                        ) : (
                          <span className="text-xs font-medium text-gray-700">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 하단 CTA */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 text-center">
        <h3 className="text-lg font-bold text-gray-900">어떤 플랜이 적합한지 모르겠다면?</h3>
        <p className="mt-1 text-sm text-gray-500">
          전문 상담사가 맞춤 플랜을 추천해 드립니다
        </p>
        <Button
          variant="primary"
          size="lg"
          className="mt-4 bg-indigo-600 hover:bg-indigo-700"
        >
          무료 상담 신청
        </Button>
      </div>

      <p className="text-center text-xs text-gray-400">
        모든 가격은 부가세(VAT) 포함 금액입니다. 연간 결제 시 2개월 무료 혜택이 적용됩니다.
      </p>
    </div>
  );
}
