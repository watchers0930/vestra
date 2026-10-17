"use client";

/**
 * 선택 상품 주문 요약 + 결제 진입 UI(설계 §4.3). 월 기준가·기간·할인·선불 총액을 함께 표시하고,
 * 매월 자동 청구가 아님을 명시한다(§3.2). 결제 실행은 부모 상태머신(onPay)이 담당한다(UI 전용).
 */

import type { MemberProductView } from "@/types/member-subscription";
import { Button } from "@/components/common/Button";
import { discountLabel, durationLabel, formatKRW, planLabel } from "./pricing-format";

interface OrderSummaryCardProps {
  product: MemberProductView | null;
  onPay: () => void;
  busy: boolean;
  payLabel?: string;
}

export function OrderSummaryCard({ product, onPay, busy, payLabel = "결제하기" }: OrderSummaryCardProps) {
  if (!product) {
    return (
      <div className="rounded-2xl border border-dashed border-[#d2d2d7] bg-white p-6 text-center text-sm text-[#8e8e93]">
        플랜과 이용 기간을 선택하면 결제 금액이 표시됩니다.
      </div>
    );
  }
  const discount = discountLabel(product.discountPercent);
  const isTrial = product.productKind === "paid_trial";
  const canPay = product.eligibleForCurrentRole && !busy;

  return (
    <div className="rounded-2xl border border-[#e5e5e7] bg-white p-6">
      <h3 className="text-base font-bold text-[#1d1d1f]">주문 요약</h3>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-[#8e8e93]">플랜</dt>
          <dd className="font-medium text-[#1d1d1f]">{planLabel(product.plan)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#8e8e93]">이용 기간</dt>
          <dd className="font-medium text-[#1d1d1f]">
            {isTrial ? "1개월 체험" : durationLabel(product.durationMonths)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#8e8e93]">월 기준가</dt>
          <dd className="text-[#1d1d1f]">{formatKRW(product.monthlyPrice)}</dd>
        </div>
        {discount && (
          <div className="flex justify-between">
            <dt className="text-[#8e8e93]">할인</dt>
            <dd className="font-medium text-[#ff3b30]">{discount}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-[#8e8e93]">등기감시 한도</dt>
          <dd className="text-[#1d1d1f]">{product.monitoringLimit}건</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-end justify-between border-t border-[#f0f0f2] pt-4">
        <span className="text-sm text-[#8e8e93]">선불 총액</span>
        <span className="text-2xl font-extrabold text-[#1d1d1f]">{formatKRW(product.amount)}</span>
      </div>
      <p className="mt-2 text-[12px] text-[#8e8e93]">
        VAT 포함 표기. 매월 자동 청구되지 않는 선불 결제이며, 기간이 끝나면 직접 재결제합니다.
      </p>
      <div className="mt-4">
        <Button variant="primary" fullWidth loading={busy} disabled={!canPay} onClick={onPay}>
          {payLabel}
        </Button>
      </div>
      {!product.eligibleForCurrentRole && product.disabledReason && (
        <p className="mt-2 text-center text-[12px] text-[#ff3b30]">{product.disabledReason}</p>
      )}
    </div>
  );
}
