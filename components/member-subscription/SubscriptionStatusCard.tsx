"use client";

/**
 * 현재 구독 현황 카드(설계 §4.3 마이페이지). GET /status 결과를 표시만 한다(UI 전용).
 * 만료·grace·잠금·체험 종료일, 감시 사용량/한도, grandfather 안내를 보여준다. 판정은 서버가 한다(§4.5).
 */

import type { MemberSubscriptionStatus } from "@/types/member-subscription";
import { Badge } from "@/components/common/Badge";
import { formatDate, planLabel, statusMeta } from "./pricing-format";

const TONE_TO_VARIANT = {
  success: "success",
  warning: "warning",
  danger: "danger",
  neutral: "neutral",
} as const;

interface SubscriptionStatusCardProps {
  status: MemberSubscriptionStatus;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <dt className="text-[#8e8e93]">{label}</dt>
      <dd className="font-medium text-[#1d1d1f]">{value}</dd>
    </div>
  );
}

export function SubscriptionStatusCard({ status }: SubscriptionStatusCardProps) {
  const meta = statusMeta(status.status);
  const isFree = status.plan === "FREE";

  return (
    <div className="rounded-2xl border border-[#e5e5e7] bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#1d1d1f]">현재 구독</h3>
        <Badge variant={TONE_TO_VARIANT[meta.tone]}>{meta.label}</Badge>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-xl font-extrabold text-[#1d1d1f]">{planLabel(status.plan)}</span>
        {status.isGrandfathered && (
          <span className="rounded-full bg-[#eef1ff] px-2 py-0.5 text-[11px] font-semibold text-[#2e4bd8]">
            기존 회원 혜택 유지
          </span>
        )}
      </div>

      <dl className="mt-4 divide-y divide-[#f0f0f2]">
        {!isFree && status.startDate && <Row label="시작일" value={formatDate(status.startDate)} />}
        {!isFree && status.endDate && <Row label="만료일" value={formatDate(status.endDate)} />}
        {status.status === "trialing" && status.trialEndsAt && (
          <Row label="체험 종료일" value={formatDate(status.trialEndsAt)} />
        )}
        {status.status === "grace" && status.graceEndsAt && (
          <Row label="유예 종료일" value={formatDate(status.graceEndsAt)} />
        )}
        {status.status === "locked" && status.lockedAt && (
          <Row label="잠금 시작" value={formatDate(status.lockedAt)} />
        )}
        <Row label="등기감시" value={`${status.monitoring.used} / ${status.monitoring.limit}건`} />
      </dl>

      {status.status === "locked" && (
        <p className="mt-3 rounded-lg bg-[#fff4f3] px-3 py-2 text-[12px] text-[#c0392b]">
          사업자 유료 기능이 잠금 상태입니다. 본인 데이터 조회·재구독은 계속 가능하며, 재결제 시 즉시 해제됩니다.
        </p>
      )}
      {status.isGrandfathered && isFree && (
        <p className="mt-3 text-[12px] text-[#8e8e93]">
          기존 이용 혜택이 유지됩니다. 구독은 선택 사항이며 미보유가 오류나 잠금이 아닙니다.
        </p>
      )}
    </div>
  );
}
