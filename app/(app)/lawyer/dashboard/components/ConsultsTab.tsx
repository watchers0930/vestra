"use client";

import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/toast";

interface Consult {
  id: string;
  name: string;
  topic: string;
  date: string;
}

// 모의 데이터 (상담 요청 연결 전)
const MOCK_CONSULTS: Consult[] = [
  { id: "C-208", name: "박문의", topic: "전세보증금 미반환 상담", date: "2026-08-22" },
  { id: "C-207", name: "최임차", topic: "계약갱신 거절 대응", date: "2026-08-20" },
];

/** 상담문의 — 이용자가 신청한 상담 요청 관리 */
export function ConsultsTab() {
  const { showToast } = useToast();

  if (MOCK_CONSULTS.length === 0) {
    return <div className="text-sm text-gray-400 py-16 text-center">접수된 상담문의가 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">이용자가 신청한 상담문의입니다. 확인 후 답변·연락합니다.</p>
      {MOCK_CONSULTS.map((c) => (
        <Card key={c.id} className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-gray-900">{c.topic}</div>
            <div className="text-xs text-gray-500 mt-1">{c.id} · {c.name} · {c.date}</div>
          </div>
          <Button variant="primary" className="flex-shrink-0"
            onClick={() => showToast(`${c.name}님께 답변 (준비 중)`, "success")}>
            답변하기
          </Button>
        </Card>
      ))}
    </div>
  );
}
