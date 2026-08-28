"use client";

import { useState } from "react";
import { X, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/common/Button";
import { CAUSE_LABELS } from "@/lib/keepzip/case-form";
import { annotateAmounts } from "@/lib/keepzip/amount";
import { statusMeta, TONE_BADGE, isReviewable } from "@/lib/keepzip/case-status";
import type { ReviewDetail } from "../hooks/useLawyerDashboard";

interface Props {
  detail: ReviewDetail;
  busy: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onClose: () => void;
}

const CHECKS = [
  "발신인·수신인·목적물 주소가 정확한지 확인했습니다.",
  "사실관계와 청구 내용에 법률적 오류가 없습니다.",
  "문서에 위법·과장·허위 표현이 없습니다.",
];

const causeLabel = (c: string) => CAUSE_LABELS[c as keyof typeof CAUSE_LABELS] ?? c;

/** 내용증명 검수 모달 — 원문 열람 → 체크리스트 → 승인·직인 / 반려(사유). 열람·확인 없이는 승인 불가. */
export function NoticeReviewModal({ detail, busy, onApprove, onReject, onClose }: Props) {
  const [checks, setChecks] = useState([false, false, false]);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");
  const allChecked = checks.every(Boolean);
  const isBusy = busy === detail.id;
  const readOnly = !isReviewable(detail.status); // 이미 처리된 사건 → 열람 전용
  const m = statusMeta(detail.status);
  const toggle = (i: number) => setChecks((p) => p.map((v, idx) => (idx === i ? !v : v)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <span className={`inline-flex items-center gap-1 text-[11px] rounded-full border px-2 py-0.5 font-medium ${TONE_BADGE[m.tone]}`}>{m.label}</span>
            <h3 className="mt-2 text-lg font-bold text-gray-900">{causeLabel(detail.cause)}</h3>
            <p className="mt-0.5 text-xs text-gray-500">{detail.senderName} <span className="text-gray-300">→</span> {detail.recipientName}</p>
            <p className="mt-0.5 text-xs text-gray-400">{detail.address}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        {/* 원문 */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">내용증명 원문{!readOnly && " — 아래 문서를 검토하세요"}</p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap max-h-72 overflow-y-auto">
            {detail.draftContent ? annotateAmounts(detail.draftContent) : "본문이 없습니다."}
          </div>
        </div>

        {readOnly ? (
          <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {m.desc || `현재 상태: ${m.label}`} — 이미 처리된 사건으로 열람만 가능합니다.
          </div>
        ) : !rejectMode ? (
          <>
            {/* 검토 확인 체크리스트 */}
            <div className="mt-5 rounded-lg border border-gray-200 p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"><ShieldCheck size={16} className="text-blue-600" /> 검토 확인 (직인 전 필수)</p>
              <ul className="mt-3 space-y-2">
                {CHECKS.map((c, i) => (
                  <li key={c}>
                    <label className="flex items-start gap-2 cursor-pointer text-[13px] text-gray-700">
                      <input type="checkbox" checked={checks[i]} onChange={() => toggle(i)} className="mt-0.5 h-4 w-4 accent-blue-600" />
                      <span>{c}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {!allChecked && <p className="mt-2 text-[11px] text-amber-600">모든 항목을 확인해야 직인할 수 있습니다.</p>}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => setRejectMode(true)}
                disabled={isBusy}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              >
                반려
              </button>
              <Button
                variant="primary"
                className="flex-1"
                loading={isBusy}
                disabled={!allChecked}
                onClick={() => onApprove(detail.id)}
              >
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={16} /> 승인·전자직인</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-lg border border-red-100 bg-red-50/40 p-4">
            <p className="text-sm font-semibold text-gray-800">반려 사유</p>
            <p className="mt-0.5 text-[11px] text-gray-500">의뢰인에게 전달됩니다. (발송 전이므로 환불 대상)</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="예: 청구 금액이 계약서와 불일치합니다. 보증금 액수를 확인 후 다시 요청해 주세요."
              className="mt-2 w-full rounded-lg border border-gray-200 p-3 text-[13px] outline-none focus:border-red-300"
            />
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setRejectMode(false)}
                disabled={isBusy}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              >
                취소
              </button>
              <Button
                variant="danger"
                className="flex-1"
                loading={isBusy}
                disabled={!reason.trim()}
                onClick={() => onReject(detail.id, reason.trim())}
              >
                반려 확정
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
