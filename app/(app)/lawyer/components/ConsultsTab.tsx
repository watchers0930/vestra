"use client";

import type { Consult } from "../hooks/useLawyerDashboard";

interface Props {
  consults: Consult[];
}

/** 상담문의 — 이용자가 신청한 상담 요청 (카드 그리드) */
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {consults.map((c) => {
          const answered = c.status === "answered";
          return (
            <div
              key={c.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
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
              <h3 className="mt-2 text-base font-bold text-gray-900">{c.topic}</h3>
              <p className="mt-1 text-xs text-gray-500">
                {c.name} <span className="text-gray-300 mx-1">·</span> {c.phone}
              </p>
              <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{c.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
