"use client";

import { useState } from "react";
import { FileText, X, CheckCircle2 } from "lucide-react";
import { CAUSE_LABELS } from "@/lib/keepzip/case-form";
import { statusMeta, KEEPZIP_TIMELINE, timelineStep, type StatusTone } from "@/lib/keepzip/case-status";
import { useKeepzipCases, fetchKeepzipDetail, type KzListItem, type KzDetail } from "../hooks/useKeepzipCases";

const TONE_BADGE: Record<StatusTone, string> = {
  pending: "bg-gray-100 text-gray-600 border-gray-200",
  progress: "bg-amber-50 text-amber-700 border-amber-100",
  done: "bg-emerald-50 text-emerald-700 border-emerald-100",
  fail: "bg-red-50 text-red-600 border-red-100",
};

const fmtDate = (v: string) => new Date(v).toLocaleDateString("ko-KR");
const causeLabel = (c: string) => CAUSE_LABELS[c as keyof typeof CAUSE_LABELS] ?? c;

/** 진행 타임라인 — 4단계 가로 스텝 */
function Timeline({ status }: { status: string }) {
  const cur = timelineStep(status);
  if (cur < 0) {
    const m = statusMeta(status);
    return <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-600">{m.label} — {m.desc}</div>;
  }
  return (
    <div className="flex items-center">
      {KEEPZIP_TIMELINE.map((label, i) => {
        const done = i <= cur;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${done ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                {done ? <CheckCircle2 size={15} /> : i + 1}
              </div>
              <span className={`text-[10.5px] whitespace-nowrap ${done ? "text-gray-900 font-medium" : "text-gray-400"}`}>{label}</span>
            </div>
            {i < KEEPZIP_TIMELINE.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 ${i < cur ? "bg-blue-600" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 사건 상세 모달 — 본문 원문 + 진행상황 */
function DetailModal({ detail, onClose }: { detail: KzDetail; onClose: () => void }) {
  const m = statusMeta(detail.status);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <span className={`text-[11px] rounded-full border px-2 py-0.5 font-medium ${TONE_BADGE[m.tone]}`}>{m.label}</span>
            <h3 className="mt-2 text-lg font-bold text-gray-900">{causeLabel(detail.cause)}</h3>
            <p className="mt-0.5 text-xs text-gray-500">{detail.senderName} <span className="text-gray-300">→</span> {detail.recipientName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        <p className="mt-3 text-sm text-gray-600">{m.desc}</p>

        <div className="mt-5">
          <Timeline status={detail.status} />
        </div>

        {detail.status === "canceled" && detail.lawyerReview?.memo && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
            <strong>반려 사유:</strong> {detail.lawyerReview.memo}
          </div>
        )}

        {detail.tracking?.trackingNo && (
          <p className="mt-4 text-xs text-gray-500">등기번호 <span className="font-mono text-gray-800">{detail.tracking.trackingNo}</span>
            {detail.tracking.deliveredAt && <> · {fmtDate(detail.tracking.deliveredAt)} 배달</>}</p>
        )}

        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">내용증명 원문</p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {detail.draftContent || "본문이 없습니다."}
          </div>
          {detail.stampUrl && (
            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 size={14} /> 변호사 전자직인 날인 완료
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
          <span>접수 {fmtDate(detail.createdAt)}</span>
          <span>결제 {detail.totalPaid.toLocaleString()}원</span>
        </div>
      </div>
    </div>
  );
}

/** 마이페이지 — 내 내용증명 사건 목록·진행상황 */
export default function ProfileKeepzipPanel() {
  const { items, loading } = useKeepzipCases();
  const [detail, setDetail] = useState<KzDetail | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const openDetail = async (id: string) => {
    setOpening(id);
    const d = await fetchKeepzipDetail(id);
    setOpening(null);
    if (d) setDetail(d);
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">불러오는 중…</div>;
  }
  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <FileText size={28} strokeWidth={1.3} className="mx-auto text-gray-300" />
        <p className="mt-3 text-base font-semibold text-gray-900">진행 중인 내용증명이 없습니다</p>
        <p className="mt-1 text-sm text-gray-400">변호사에게 내용증명을 요청하면 여기에서 진행상황을 확인할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-gray-500 mb-4">변호사에게 요청한 내용증명의 내용과 진행상황을 확인할 수 있습니다.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((c: KzListItem) => {
          const m = statusMeta(c.status);
          return (
            <button
              key={c.id}
              onClick={() => openDetail(c.id)}
              disabled={opening === c.id}
              className="flex flex-col items-start rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md disabled:opacity-60"
            >
              <span className={`text-[11px] rounded-full border px-2 py-0.5 font-medium ${TONE_BADGE[m.tone]}`}>{m.label}</span>
              <span className="mt-2 text-sm font-bold text-gray-900">{causeLabel(c.cause)}</span>
              <span className="mt-0.5 text-xs text-gray-500">{c.senderName} → {c.recipientName}</span>
              <span className="mt-2 text-[11px] text-blue-600">{opening === c.id ? "여는 중…" : "내용·진행상황 보기"}</span>
            </button>
          );
        })}
      </div>
      {detail && <DetailModal detail={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
