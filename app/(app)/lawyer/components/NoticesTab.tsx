"use client";

import { Button } from "@/components/common/Button";
import type { NoticeCase } from "../hooks/useLawyerDashboard";

interface Props {
  cases: NoticeCase[];
  busy: string | null;
  onApprove: (id: string) => void;
}

const CAUSE_LABEL: Record<string, string> = {
  deposit_return: "보증금 반환청구",
  terminate_by_tenant: "부동산 계약해지(세입자용)",
  terminate_by_landlord: "부동산 계약해지(임대인용)",
  rent_arrears: "월세 청구",
  maintenance_arrears: "체납 관리비 납부 요청",
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  lawyer_pending: { text: "검수 대기", cls: "bg-amber-50 text-amber-700 border-amber-100" },
  lawyer_approved: { text: "직인 완료", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  canceled: { text: "반려", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

/** 내용증명 — 개인이 보낸 사건 검수·전자직인 (카드 그리드) */
export function NoticesTab({ cases, busy, onApprove }: Props) {
  if (cases.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold text-gray-900">검수 대기 중인 내용증명이 없습니다</p>
        <p className="mt-1 text-sm text-gray-400">개인이 결제 후 보낸 사건이 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-5">
        개인이 결제 후 보낸 내용증명입니다. 내용을 검수하고 전자직인을 찍어 발송합니다.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cases.map((c) => {
          const st = STATUS_LABEL[c.status] ?? { text: c.status, cls: "bg-gray-100 text-gray-500 border-gray-200" };
          return (
            <div
              key={c.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className={`text-[11px] rounded-full border px-2 py-0.5 font-medium ${st.cls}`}>{st.text}</span>
                <span className="text-[11px] tracking-wide text-gray-400 uppercase">내용증명</span>
              </div>
              <h3 className="mt-2 text-base font-bold text-gray-900">{CAUSE_LABEL[c.cause] ?? c.cause}</h3>
              <p className="mt-1 text-xs text-gray-500">
                {c.senderName} <span className="text-gray-300">→</span> {c.recipientName}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">{c.id.slice(0, 10)}</p>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <Button
                  variant="primary"
                  className="w-full"
                  loading={busy === c.id}
                  disabled={c.status !== "lawyer_pending"}
                  onClick={() => onApprove(c.id)}
                >
                  {c.status === "lawyer_approved" ? "직인 완료" : "승인·직인"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
