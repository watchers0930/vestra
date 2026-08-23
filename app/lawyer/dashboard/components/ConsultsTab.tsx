"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/common/Card";

interface Consult {
  id: string;
  name: string;
  phone: string;
  topic: string;
  content: string;
  status: string;
  createdAt: string;
}

/** 상담문의 — 이용자가 신청한 상담 요청 (DB 실데이터) */
export function ConsultsTab() {
  const [items, setItems] = useState<Consult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/keepzip/consults?as=lawyer")
      .then((r) => (r.ok ? r.json() : { consults: [] }))
      .then((d) => setItems(Array.isArray(d.consults) ? d.consults : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">불러오는 중...</div>;
  if (items.length === 0) return <div className="text-sm text-gray-400 py-16 text-center">접수된 상담문의가 없습니다.</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">이용자가 신청한 상담문의입니다.</p>
      {items.map((c) => (
        <Card key={c.id} className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-gray-900">{c.topic}</div>
            <span className={`text-xs rounded px-1.5 py-0.5 ${c.status === "answered" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {c.status === "answered" ? "답변완료" : "접수"}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">{c.name} · {c.phone}</div>
          <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{c.content}</p>
        </Card>
      ))}
    </div>
  );
}
