"use client";

import { useState } from "react";
import { Clock, User, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { isoToKey } from "./ConsultCalendar";
import type { Visit } from "../hooks/useLawyerDashboard";

const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "-";

const ST: Record<string, { t: string; c: string }> = {
  pending: { t: "요청", c: "bg-amber-50 text-amber-700 border-amber-100" },
  confirmed: { t: "확정", c: "bg-emerald-50 text-emerald-700 border-emerald-100" },
};

/** 선택 날짜의 방문 예약 (시간순) + 예약 확정 — 상담 일정 패널과 동일 UI. */
export function VisitDayPanel({ dateKey, visits, busy, onConfirm }: {
  dateKey: string;
  visits: Visit[];
  busy: string | null;
  onConfirm: (id: string) => void;
}) {
  const [detail, setDetail] = useState<Visit | null>(null);
  const list = visits
    .filter((v) => isoToKey(v.preferredAt) === dateKey)
    .sort((a, b) => String(a.preferredAt).localeCompare(String(b.preferredAt)));

  const [, m, d] = dateKey.split("-");
  const label = `${Number(m)}월 ${Number(d)}일`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900">{label} 방문 예약</h3>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">{list.length}건</p>

      {list.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">이 날짜에 신청된 방문 예약이 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map((v) => {
            const st = ST[v.status] ?? ST.pending;
            const confirmed = v.status === "confirmed";
            return (
              <div key={v.id} className="rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => setDetail(v)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900"><Clock size={14} className="text-emerald-600" />{fmtTime(v.preferredAt)}</span>
                  <span className={`text-[11px] rounded-full border px-2 py-0.5 font-medium ${st.c}`}>{st.t}</span>
                </div>
                <p className="mt-2 text-[13px] text-gray-700"><User size={12} className="inline mr-1 text-gray-400" />{v.name} · {v.phone}</p>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{v.purpose}</p>
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  <Button variant="primary" className="w-full" loading={busy === v.id} disabled={confirmed} onClick={() => onConfirm(v.id)}>
                    {confirmed ? "확정됨" : "예약 확정"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[11px] rounded-full border px-2 py-0.5 font-medium ${(ST[detail.status] ?? ST.pending).c}`}>{(ST[detail.status] ?? ST.pending).t}</span>
                <h3 className="mt-2 text-lg font-bold text-gray-900">방문 예약</h3>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="mt-4 space-y-1.5 text-sm text-gray-700">
              <p><span className="text-gray-400">신청인</span> {detail.name} · {detail.phone}</p>
              <p><span className="text-gray-400">희망 방문 시간</span> {detail.preferredAt ? new Date(detail.preferredAt).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}</p>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">방문 목적 / 메모</p>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap">{detail.purpose || "내용 없음"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
