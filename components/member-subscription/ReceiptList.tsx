"use client";

/**
 * 결제 영수증 목록(설계 §4.3 마이페이지). GET /status의 receipts를 표시만 한다(UI 전용).
 * receiptUrl은 서버가 검증한 공급자 값만 내려오므로(§4.10), 있으면 링크로 표시하고 없으면 생략한다.
 */

import { ExternalLink } from "lucide-react";
import type { MemberSubscriptionStatus } from "@/types/member-subscription";
import { formatDate, formatKRW, planLabel } from "./pricing-format";

interface ReceiptListProps {
  receipts: MemberSubscriptionStatus["receipts"];
}

export function ReceiptList({ receipts }: ReceiptListProps) {
  if (!receipts.length) {
    return <p className="text-sm text-[#8e8e93]">결제 이력이 없습니다.</p>;
  }
  return (
    <ul className="divide-y divide-[#f0f0f2]">
      {receipts.map((r) => (
        <li key={r.orderId} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-[#1d1d1f]">{planLabel(r.plan)}</p>
            <p className="text-[12px] text-[#8e8e93]">{formatDate(r.paidAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#1d1d1f]">{formatKRW(r.amount)}</span>
            {r.receiptUrl && (
              <a
                href={r.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
              >
                영수증 <ExternalLink size={12} />
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
