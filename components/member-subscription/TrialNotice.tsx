"use client";

/**
 * 7일 무료체험 안내·시작 CTA(설계 §4.8). 결제 승인 없는 trialing 권한이며 자동청구·카드 수집이 없음을 명시한다.
 * 적격(trialEligible)일 때만 시작 버튼을 노출한다. UI 전용 — 시작은 부모(onStartTrial)가 서버에 위임한다.
 */

import { AlertCircle, Gift } from "lucide-react";
import type { MemberPlan } from "@/types/member-subscription";
import { Button } from "@/components/common/Button";
import { planLabel } from "./pricing-format";

interface TrialNoticeProps {
  /** 적격 7일 무료체험 플랜(개인=PRO, 사업자=PREMIUM). null이면 비적격 → 노출 안 함 */
  trialPlan: MemberPlan | null;
  onStartTrial: (plan: MemberPlan) => void;
  busy?: boolean;
  /** 체험 시작 실패 안내(401/409/일시 장애 등). null이면 미표시. */
  errorMessage?: string | null;
}

export function TrialNotice({ trialPlan, onStartTrial, busy, errorMessage }: TrialNoticeProps) {
  if (!trialPlan) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#d9f0e2] bg-[#f3fbf6] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <Gift size={18} className="mt-0.5 text-[#30d158]" />
          <div>
            <p className="text-sm font-semibold text-[#1d1d1f]">7일 무료체험</p>
            <p className="text-[12px] text-[#48484a]">
              {planLabel(trialPlan)} 기능을 7일간 무료로 이용합니다. 계정당 1회, 결제 수단을 받지 않으며
              종료 시 자동으로 결제되지 않습니다.
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" loading={busy} onClick={() => onStartTrial(trialPlan)}>
          무료체험 시작
        </Button>
      </div>
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl bg-[#fff4f3] px-3 py-2 text-[12px] text-[#c0392b]" role="alert">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
