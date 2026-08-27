"use client";

import { Button } from "@/components/common/Button";
import type { Visit } from "../hooks/useLawyerDashboard";

interface Props {
  visits: Visit[];
  busy: string | null;
  onConfirm: (id: string) => void;
}

/** 방문예약 — 사무실 방문 상담 예약 (카드 그리드) */
export function VisitsTab({ visits, busy, onConfirm }: Props) {
  if (visits.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold text-gray-900">접수된 방문 예약이 없습니다</p>
        <p className="mt-1 text-sm text-gray-400">사무실 방문 상담 요청이 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-5">사무실 방문 상담 예약입니다. 요청을 확인하고 확정합니다.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {visits.map((v) => {
          const confirmed = v.status === "confirmed";
          return (
            <div
              key={v.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] rounded-full border px-2 py-0.5 font-medium ${
                    confirmed
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-amber-50 text-amber-700 border-amber-100"
                  }`}
                >
                  {confirmed ? "확정" : "요청"}
                </span>
                <span className="text-[11px] tracking-wide text-gray-400 uppercase">방문예약</span>
              </div>
              <h3 className="mt-2 text-base font-bold text-gray-900">{v.preferredAt}</h3>
              <p className="mt-1 text-xs text-gray-500">
                {v.name} <span className="text-gray-300 mx-1">·</span> {v.phone}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{v.purpose}</p>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <Button
                  variant="primary"
                  className="w-full"
                  loading={busy === v.id}
                  disabled={confirmed}
                  onClick={() => onConfirm(v.id)}
                >
                  {confirmed ? "확정됨" : "예약 확정"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
