"use client";

import { Button } from "@/components/common/Button";
import type { Visit } from "../hooks/useLawyerDashboard";

interface Props {
  visits: Visit[];
  busy: string | null;
  onConfirm: (id: string) => void;
}

/** 방문예약 — 사무실 방문 상담 예약 (넘버링 에디토리얼 카드) */
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
      <ul className="divide-y divide-gray-100">
        {visits.map((v, i) => {
          const confirmed = v.status === "confirmed";
          return (
            <li key={v.id} className="group flex items-center gap-5 py-5">
              <span className="text-2xl font-bold tabular-nums text-gray-200 group-hover:text-blue-500 transition-colors w-9 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
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
                <h3 className="mt-1.5 text-lg font-bold text-gray-900 truncate">{v.preferredAt}</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {v.name} <span className="text-gray-300 mx-1">·</span> {v.phone}
                  <span className="text-gray-300 mx-1.5">·</span> {v.purpose}
                </p>
              </div>
              <div className="shrink-0">
                <Button
                  variant="primary"
                  loading={busy === v.id}
                  disabled={confirmed}
                  onClick={() => onConfirm(v.id)}
                >
                  {confirmed ? "확정됨" : "예약 확정"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
