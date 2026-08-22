"use client";

import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/toast";

interface Visit {
  id: string;
  name: string;
  when: string;
  purpose: string;
  status: "requested" | "confirmed";
}

// 모의 데이터 (방문예약 연결 전)
const MOCK_VISITS: Visit[] = [
  { id: "V-31", name: "김동의", when: "2026-08-25 14:00", purpose: "내용증명 대면 상담", status: "requested" },
  { id: "V-30", name: "이세입", when: "2026-08-26 10:30", purpose: "임대차 분쟁 상담", status: "confirmed" },
];

/** 방문예약 — 사무실 방문 상담 예약 관리 */
export function VisitsTab() {
  const { showToast } = useToast();

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">사무실 방문 상담 예약입니다. 요청을 확인하고 확정합니다.</p>
      {MOCK_VISITS.map((v) => (
        <Card key={v.id} className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{v.when}</span>
              <span className={`text-xs rounded px-1.5 py-0.5 ${v.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {v.status === "confirmed" ? "확정" : "요청"}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{v.id} · {v.name} · {v.purpose}</div>
          </div>
          <Button variant="primary" disabled={v.status === "confirmed"} className="flex-shrink-0"
            onClick={() => showToast(`${v.when} 예약 확정 (모의)`, "success")}>
            {v.status === "confirmed" ? "확정됨" : "예약 확정"}
          </Button>
        </Card>
      ))}
    </div>
  );
}
