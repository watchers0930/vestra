"use client";

/**
 * 마이페이지 회원 구독 현황 패널(설계 §4.3). GET /status를 유일 근거로 현재 플랜·상태·만료·감시 사용량·
 * 영수증·재구독 CTA를 표시한다(조합·진입). 재구독/구매는 요금제 화면에서 명시 결제로 진행한다(클릭 즉시 과금 아님).
 * 기존 구독 관리 카드와 독립이며, 백엔드 status 준비 전에는 요금제 안내로 폴백한다(라이브 비파괴).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { SubscriptionStatusCard } from "@/components/member-subscription/SubscriptionStatusCard";
import { ReceiptList } from "@/components/member-subscription/ReceiptList";
import { RenewalCtaCard } from "@/components/member-subscription/RenewalCtaCard";
import { useMemberSubscription } from "@/app/(personal-home)/renewal/pricing/hooks/useMemberSubscription";

export default function MemberSubscriptionPanel() {
  const router = useRouter();
  const { status, loading, unauthenticated } = useMemberSubscription();

  if (unauthenticated) return null;

  if (loading) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#e5e5e7] bg-white p-6 text-sm text-[#8e8e93]">
        <Loader2 size={16} className="animate-spin text-primary" />
        구독 현황을 불러오는 중…
      </div>
    );
  }

  // status 미확보(백엔드 준비 전 등) → 요금제 안내로 폴백
  if (!status) {
    return (
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#e8eaf2] bg-[#f7f9ff] p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#48484a]">구독 플랜을 선택해 더 많은 기능을 이용하세요.</p>
        <Link href="/renewal/pricing">
          <Button variant="primary" size="sm">
            요금제 보기
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-4">
      <SubscriptionStatusCard status={status} />

      {status.renewalCandidate && (
        <RenewalCtaCard candidate={status.renewalCandidate} onRenew={() => router.push("/renewal/pricing")} />
      )}

      {status.receipts.length > 0 && (
        <div className="rounded-2xl border border-[#e5e5e7] bg-white p-6">
          <h3 className="mb-3 text-base font-bold text-[#1d1d1f]">결제 이력</h3>
          <ReceiptList receipts={status.receipts} />
        </div>
      )}

      <div className="flex justify-end">
        <Link href="/renewal/pricing">
          <Button variant="secondary" size="sm">
            플랜 변경 · 재구독
          </Button>
        </Link>
      </div>
    </div>
  );
}
