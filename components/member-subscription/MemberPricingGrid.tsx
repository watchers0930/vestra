"use client";

/**
 * 회원 플랜 개요 그리드(FREE/PRO/PREMIUM) — 설계 §4.3.
 * 감시 한도·월 기준가·주요 혜택을 표시하고, 역할이 선택 가능한 유료 플랜만 CTA를 활성화한다.
 * 가격·한도는 서버 SSOT를 표시만 하며(§4.1), 자동청구가 아님을 함께 안내한다(§3.2).
 */

import { Building2, Check, Crown, User } from "lucide-react";
import type { MemberPlan } from "@/types/member-subscription";
import { Button } from "@/components/common/Button";
import { formatKRW } from "./pricing-format";

interface MemberPricingGridProps {
  monthlyBase: Record<MemberPlan, number>;
  monitoringLimit: Record<MemberPlan, number>;
  allowedPlans: MemberPlan[];
  selectedPlan: MemberPlan | null;
  onSelectPlan: (plan: MemberPlan) => void;
  /** 개인 회원이면 FREE 이용 가능 안내, 사업자면 FREE 불가 안내 */
  personalFreeAvailable: boolean;
}

const FREE_FEATURES = ["일 3회 AI 분석", "기본 시세 조회", "등기감시 미제공"];
const PRO_FEATURES = ["무제한 AI 분석", "실시간 시세 알림", "PDF 리포트"];
const PREMIUM_FEATURES = ["프로 기능 전체 포함", "사업자 전용 기능", "우선 지원"];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((f) => (
        <li key={f} className="flex items-center gap-2 text-sm text-[#48484a]">
          <Check size={15} className="shrink-0 text-[#30d158]" />
          {f}
        </li>
      ))}
    </ul>
  );
}

export function MemberPricingGrid({
  monthlyBase,
  monitoringLimit,
  allowedPlans,
  selectedPlan,
  onSelectPlan,
  personalFreeAvailable,
}: MemberPricingGridProps) {
  const proAllowed = allowedPlans.includes("PRO");
  const premiumAllowed = allowedPlans.includes("PREMIUM");

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {/* FREE */}
      <div className="flex flex-col rounded-2xl border border-[#e8eaf2] bg-white p-6">
        <div className="flex items-center gap-2">
          <User size={18} className="text-[#6e6e73]" />
          <h3 className="text-lg font-bold text-[#1d1d1f]">무료</h3>
        </div>
        <div className="mt-3">
          <span className="text-3xl font-extrabold text-[#1d1d1f]">0원</span>
        </div>
        <p className="mt-1 text-sm text-[#8e8e93]">등기감시 {monitoringLimit.PRO > 0 ? "0" : 0}건</p>
        <FeatureList items={FREE_FEATURES} />
        <div className="mt-auto pt-6">
          <Button variant="secondary" fullWidth disabled>
            {personalFreeAvailable ? "결제 없이 이용" : "사업자 회원은 선택 불가"}
          </Button>
        </div>
      </div>

      {/* PRO */}
      <div
        className={[
          "flex flex-col rounded-2xl border bg-white p-6",
          selectedPlan === "PRO" ? "border-primary ring-2 ring-primary/30" : "border-[#2e4bd8]",
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <Crown size={18} className="text-[#2e4bd8]" />
          <h3 className="text-lg font-bold text-[#1d1d1f]">프로</h3>
        </div>
        <div className="mt-3">
          <span className="text-3xl font-extrabold text-[#1d1d1f]">{formatKRW(monthlyBase.PRO)}</span>
          <span className="ml-1 text-sm text-[#8e8e93]">/ 월 기준</span>
        </div>
        <p className="mt-1 text-sm text-[#8e8e93]">등기감시 {monitoringLimit.PRO}건</p>
        <FeatureList items={PRO_FEATURES} />
        <div className="mt-auto pt-6">
          <Button variant="primary" fullWidth disabled={!proAllowed} onClick={() => onSelectPlan("PRO")}>
            {proAllowed ? "PRO 선택" : "선택 불가"}
          </Button>
        </div>
      </div>

      {/* PREMIUM */}
      <div
        className={[
          "flex flex-col rounded-2xl border bg-white p-6",
          selectedPlan === "PREMIUM" ? "border-primary ring-2 ring-primary/30" : "border-[#e8eaf2]",
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-[#0071e3]" />
          <h3 className="text-lg font-bold text-[#1d1d1f]">프리미엄</h3>
        </div>
        <div className="mt-3">
          <span className="text-3xl font-extrabold text-[#1d1d1f]">{formatKRW(monthlyBase.PREMIUM)}</span>
          <span className="ml-1 text-sm text-[#8e8e93]">/ 월 기준</span>
        </div>
        <p className="mt-1 text-sm text-[#8e8e93]">등기감시 {monitoringLimit.PREMIUM}건 · 사업자 전용</p>
        <FeatureList items={PREMIUM_FEATURES} />
        <div className="mt-auto pt-6">
          <Button
            variant={premiumAllowed ? "primary" : "secondary"}
            fullWidth
            disabled={!premiumAllowed}
            onClick={() => onSelectPlan("PREMIUM")}
          >
            {premiumAllowed ? "PREMIUM 선택" : "개인 회원은 선택 불가"}
          </Button>
        </div>
      </div>
    </div>
  );
}
