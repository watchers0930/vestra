"use client";

import type { Consult } from "../hooks/useLawyerDashboard";

interface Props {
  consults: Consult[];
}

/** 상담문의 — 이용자가 신청한 상담 요청 (넘버링 에디토리얼 카드) */
export function ConsultsTab({ consults }: Props) {
  if (consults.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold text-gray-900">접수된 상담문의가 없습니다</p>
        <p className="mt-1 text-sm text-gray-400">이용자가 신청한 상담이 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-5">이용자가 신청한 상담문의입니다.</p>
      <ul className="divide-y divide-gray-100">
        {consults.map((c, i) => {
          const answered = c.status === "answered";
          return (
            <li key={c.id} className="group flex gap-5 py-5">
              <span className="text-2xl font-bold tabular-nums text-gray-200 group-hover:text-blue-500 transition-colors w-9 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] rounded-full border px-2 py-0.5 font-medium ${
                      answered
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}
                  >
                    {answered ? "답변완료" : "접수"}
                  </span>
                  <span className="text-[11px] tracking-wide text-gray-400 uppercase">상담문의</span>
                </div>
                <h3 className="mt-1.5 text-lg font-bold text-gray-900">{c.topic}</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {c.name} <span className="text-gray-300 mx-1">·</span> {c.phone}
                </p>
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{c.content}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
