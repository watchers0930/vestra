"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/toast";

interface Visit {
  id: string;
  name: string;
  phone: string;
  preferredAt: string;
  purpose: string;
  status: string;
  createdAt: string;
}

/** 방문예약 — 사무실 방문 상담 예약 (DB 실데이터) */
export function VisitsTab() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    fetch("/api/keepzip/visits?as=lawyer")
      .then((r) => (r.ok ? r.json() : { visits: [] }))
      .then((d) => setItems(Array.isArray(d.visits) ? d.visits : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const confirm = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch("/api/keepzip/visits", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) { showToast(d?.error ?? "확정 실패", "error"); return; }
      showToast("방문 예약을 확정했습니다.", "success");
      load();
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">불러오는 중...</div>;
  if (items.length === 0) return <div className="text-sm text-gray-400 py-16 text-center">접수된 방문 예약이 없습니다.</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">사무실 방문 상담 예약입니다. 요청을 확인하고 확정합니다.</p>
      {items.map((v) => (
        <Card key={v.id} className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{v.preferredAt}</span>
              <span className={`text-xs rounded px-1.5 py-0.5 ${v.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {v.status === "confirmed" ? "확정" : "요청"}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{v.name} · {v.phone} · {v.purpose}</div>
          </div>
          <Button variant="primary" className="flex-shrink-0" loading={busy === v.id} disabled={v.status === "confirmed"} onClick={() => confirm(v.id)}>
            {v.status === "confirmed" ? "확정됨" : "예약 확정"}
          </Button>
        </Card>
      ))}
    </div>
  );
}
