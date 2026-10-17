"use client";

/**
 * 플랜 기간 선택 UI(설계 §4.3). 한 플랜의 기간별 상품(MemberProductView[])을 라디오형 카드로 표시한다.
 * 금액·할인·한도는 서버 SSOT 스냅샷을 **표시만** 한다(§4.1). 부적격 상품은 사유와 함께 비활성 표시(§4.3).
 * UI 전용 — 선택 결과만 onSelect로 올린다(상태·결제 로직 없음).
 */

import { Check } from "lucide-react";
import type { MemberProductView } from "@/types/member-subscription";
import { discountLabel, durationLabel, formatKRW, monthlyEquivalentLabel } from "./pricing-format";

interface PlanDurationPickerProps {
  products: MemberProductView[];
  selected: MemberProductView | null;
  onSelect: (product: MemberProductView) => void;
  disabled?: boolean;
}

function sameProduct(a: MemberProductView | null, b: MemberProductView): boolean {
  return !!a && a.plan === b.plan && a.durationMonths === b.durationMonths && a.productKind === b.productKind;
}

export function PlanDurationPicker({ products, selected, onSelect, disabled }: PlanDurationPickerProps) {
  return (
    <ul className="space-y-2">
      {products.map((p) => {
        const on = sameProduct(selected, p);
        const blocked = !p.eligibleForCurrentRole;
        const discount = discountLabel(p.discountPercent);
        const isTrial = p.productKind === "paid_trial";
        return (
          <li key={`${p.plan}-${p.durationMonths}-${p.productKind}`}>
            <button
              type="button"
              disabled={disabled || blocked}
              onClick={() => onSelect(p)}
              aria-pressed={on}
              className={[
                "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                on ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-[#e5e5e7] bg-white",
                blocked ? "opacity-50 cursor-not-allowed" : "hover:border-primary/60",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "flex h-5 w-5 items-center justify-center rounded-full border",
                      on ? "border-primary bg-primary text-white" : "border-[#c7c7cc]",
                    ].join(" ")}
                  >
                    {on && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="font-semibold text-[#1d1d1f]">
                    {isTrial ? "1개월 체험" : durationLabel(p.durationMonths)}
                  </span>
                  {discount && (
                    <span className="rounded-full bg-[#ffece8] px-2 py-0.5 text-[11px] font-semibold text-[#ff3b30]">
                      {discount}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-[#1d1d1f]">{formatKRW(p.amount)}</div>
                  {!isTrial && p.durationMonths > 1 && (
                    <div className="text-[11px] text-[#8e8e93]">{monthlyEquivalentLabel(p.amount, p.durationMonths)}</div>
                  )}
                </div>
              </div>
              {blocked && p.disabledReason && (
                <p className="mt-1 pl-7 text-[12px] text-[#8e8e93]">{p.disabledReason}</p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
