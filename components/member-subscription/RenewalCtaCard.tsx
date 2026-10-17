"use client";

/**
 * 재구독 CTA 카드(설계 §4.3·§5.2). GET /status의 renewalCandidate(마지막 적격 플랜·기간)를 미리 선택해
 * 결제 확인으로 연결한다. 클릭 즉시 과금이 아니며, 가격 변경 시 현재 총액을 다시 확인받는다(§4.3).
 * UI 전용 — 실제 결제는 부모(onRenew)가 명시 실행한다.
 */

import { RefreshCw } from "lucide-react";
import type { MemberSubscriptionStatus } from "@/types/member-subscription";
import { Button } from "@/components/common/Button";
import { durationLabel, planLabel } from "./pricing-format";

interface RenewalCtaCardProps {
  candidate: MemberSubscriptionStatus["renewalCandidate"];
  onRenew: () => void;
  busy?: boolean;
}

export function RenewalCtaCard({ candidate, onRenew, busy }: RenewalCtaCardProps) {
  if (!candidate) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e8eaf2] bg-[#f7f9ff] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <RefreshCw size={18} className="mt-0.5 text-[#2e4bd8]" />
        <div>
          <p className="text-sm font-semibold text-[#1d1d1f]">
            {planLabel(candidate.plan)} · {durationLabel(candidate.durationMonths)} 재구독
          </p>
          <p className="text-[12px] text-[#8e8e93]">
            마지막 이용 플랜으로 바로 결제할 수 있습니다. 결제 확인 화면에서 금액을 다시 확인하세요.
          </p>
        </div>
      </div>
      <Button variant="primary" size="sm" loading={busy} onClick={onRenew}>
        재구독 확인
      </Button>
    </div>
  );
}
