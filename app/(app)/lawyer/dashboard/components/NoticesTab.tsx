"use client";

import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/toast";

interface NoticeCase {
  id: string;
  client: string;
  cause: string;
  date: string;
  status: "pending" | "approved";
}

// 모의 데이터 (사건 저장 API 연결 전)
const MOCK_CASES: NoticeCase[] = [
  { id: "KZ-1024", client: "김동의", cause: "보증금 반환청구", date: "2026-08-22", status: "pending" },
  { id: "KZ-1023", client: "이세입", cause: "부동산 계약해지(세입자용)", date: "2026-08-21", status: "pending" },
];

const STATUS_LABEL: Record<NoticeCase["status"], { text: string; cls: string }> = {
  pending: { text: "검수 대기", cls: "bg-amber-50 text-amber-700" },
  approved: { text: "직인 완료", cls: "bg-emerald-50 text-emerald-700" },
};

/** 내용증명 — 개인이 보낸 사건 검수·전자직인 */
export function NoticesTab() {
  const { showToast } = useToast();

  if (MOCK_CASES.length === 0) {
    return <div className="text-sm text-gray-400 py-16 text-center">검수 대기 중인 내용증명이 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">개인이 결제 후 보낸 내용증명입니다. 내용을 검수하고 전자직인을 찍어 발송합니다.</p>
      {MOCK_CASES.map((c) => {
        const st = STATUS_LABEL[c.status];
        return (
          <Card key={c.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{c.cause}</span>
                <span className={`text-xs rounded px-1.5 py-0.5 ${st.cls}`}>{st.text}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{c.id} · 의뢰인 {c.client} · {c.date}</div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="ghost" onClick={() => showToast(`${c.id} 문서 검수 화면 (준비 중)`, "success")}>검수</Button>
              <Button variant="primary" disabled={c.status === "approved"}
                onClick={() => showToast(`${c.id} 전자직인 날인 완료 (모의)`, "success")}>
                {c.status === "approved" ? "직인 완료" : "승인·직인"}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
