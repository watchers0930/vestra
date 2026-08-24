"use client";

import { useEffect, useState } from "react";

interface Received {
  id: string;
  causeLabel: string;
  senderName: string;
  address: string;
  deposit: number | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  lawyer_approved: { text: "발송 준비", cls: "bg-amber-50 text-amber-700" },
  postal_sent: { text: "발송됨", cls: "bg-blue-50 text-blue-700" },
  delivered: { text: "도달", cls: "bg-emerald-50 text-emerald-700" },
};

/** 임대인 수신함 — 나에게 온(계약 연결된) 내용증명 목록 */
export default function ReceivedContent() {
  const [items, setItems] = useState<Received[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/keepzip/received")
      .then((r) => (r.ok ? r.json() : { received: [] }))
      .then((d) => setItems(Array.isArray(d.received) ? d.received : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">받은 내용증명</h1>
      <p className="text-sm text-gray-500 mt-1">임대인님에게 도달한(또는 발송된) 내용증명입니다. 계약과 연결된 건이 표시됩니다.</p>

      {loading ? (
        <div className="text-sm text-gray-400 py-16 text-center">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-400 py-16 text-center">받은 내용증명이 없습니다.</div>
      ) : (
        <div className="space-y-3 mt-5">
          {items.map((c) => {
            const st = STATUS_LABEL[c.status] ?? { text: c.status, cls: "bg-gray-100 text-gray-500" };
            return (
              <div key={c.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-gray-900">{c.causeLabel}</span>
                  <span className={`text-xs rounded px-1.5 py-0.5 ${st.cls}`}>{st.text}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">발신 {c.senderName} · {c.address}</div>
                {c.deposit != null && (
                  <div className="text-xs text-gray-500 mt-0.5">보증금 {Number(c.deposit).toLocaleString()}원</div>
                )}
                <div className="text-[11px] text-gray-400 mt-1">
                  {c.sentAt ? `발송일 ${c.sentAt.slice(0, 10)}` : `접수일 ${c.createdAt.slice(0, 10)}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
