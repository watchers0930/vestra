"use client";

import { useState } from "react";
import { Clock, User, Check } from "lucide-react";
import { isoToKey } from "./ConsultCalendar";
import type { Consult } from "../hooks/useLawyerDashboard";

const fmtTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "-");
const fmtFull = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");

const ST: Record<string, { t: string; c: string }> = {
  pending: { t: "응답 대기", c: "bg-amber-50 text-amber-700 border-amber-100" },
  accepted: { t: "수락함", c: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  proposed: { t: "시간 제안함", c: "bg-blue-50 text-blue-700 border-blue-100" },
  confirmed: { t: "확정", c: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  rejected: { t: "취소", c: "bg-gray-100 text-gray-500 border-gray-200" },
  answered: { t: "완료", c: "bg-gray-100 text-gray-500 border-gray-200" },
};

/** 선택 날짜의 상담 일정 (시간순) + 수락/역제안 */
export function ConsultDayPanel({ dateKey, consults, busy, onAccept, onPropose }: {
  dateKey: string;
  consults: Consult[];
  busy: string | null;
  onAccept: (id: string) => void;
  onPropose: (id: string, at: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [at, setAt] = useState("");

  const list = consults
    .filter((c) => isoToKey(c.preferredAt) === dateKey)
    .sort((a, b) => String(a.preferredAt).localeCompare(String(b.preferredAt)));

  const [, m, d] = dateKey.split("-");
  const label = `${Number(m)}월 ${Number(d)}일`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900">{label} 상담 일정</h3>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">{list.length}건</p>

      {list.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">이 날짜에 신청된 상담이 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map((c) => {
            const st = ST[c.status] ?? ST.pending;
            const isBusy = busy === c.id;
            const canRespond = c.status === "pending";
            return (
              <div key={c.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900"><Clock size={14} className="text-blue-600" />{fmtTime(c.preferredAt)}</span>
                  <span className={`text-[11px] rounded-full border px-2 py-0.5 font-medium ${st.c}`}>{st.t}</span>
                </div>
                <p className="mt-2 text-[13px] text-gray-700"><User size={12} className="inline mr-1 text-gray-400" />{c.name} · {c.phone}</p>
                <p className="mt-1 text-xs text-gray-500">{c.topic}</p>
                <p className="mt-2 text-[13px] text-gray-600 whitespace-pre-wrap leading-relaxed">{c.content}</p>

                {c.status === "proposed" && c.proposedAt && (
                  <p className="mt-2 text-xs text-blue-700">제안한 시간: {fmtFull(c.proposedAt)} · 이용자 확인 대기</p>
                )}
                {(c.status === "accepted" || c.status === "confirmed") && (
                  <p className="mt-2 text-xs text-emerald-700">확정 시간: {fmtFull(c.confirmedAt ?? c.preferredAt)}</p>
                )}

                {canRespond && (
                  <div className="mt-3">
                    {openId === c.id ? (
                      <div className="flex flex-col gap-2">
                        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-blue-400" />
                        <div className="flex gap-2">
                          <button onClick={() => setOpenId(null)} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm">취소</button>
                          <button disabled={isBusy || !at} onClick={() => { onPropose(c.id, at); setOpenId(null); setAt(""); }} className="flex-1 rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold disabled:opacity-50">이 시간 제안</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button disabled={isBusy} onClick={() => { setOpenId(c.id); setAt(""); }} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium hover:border-blue-300">다른 시간 제안</button>
                        <button disabled={isBusy} onClick={() => onAccept(c.id)} className="flex-1 rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1"><Check size={14} />수락</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
