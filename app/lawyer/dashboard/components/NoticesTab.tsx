"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/toast";

interface NoticeCase {
  id: string;
  cause: string;
  senderName: string;
  recipientName: string;
  status: string;
  createdAt: string;
}

const CAUSE_LABEL: Record<string, string> = {
  deposit_return: "보증금 반환청구",
  terminate_by_tenant: "부동산 계약해지(세입자용)",
  terminate_by_landlord: "부동산 계약해지(임대인용)",
  rent_arrears: "월세 청구",
  maintenance_arrears: "체납 관리비 납부 요청",
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  lawyer_pending: { text: "검수 대기", cls: "bg-amber-50 text-amber-700" },
  lawyer_approved: { text: "직인 완료", cls: "bg-emerald-50 text-emerald-700" },
  canceled: { text: "반려", cls: "bg-gray-100 text-gray-500" },
};

/** 내용증명 — 개인이 보낸 사건 검수·전자직인 (DB 실데이터) */
export function NoticesTab() {
  const { showToast } = useToast();
  const [cases, setCases] = useState<NoticeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    fetch("/api/keepzip/cases?as=lawyer")
      .then((r) => (r.ok ? r.json() : { cases: [] }))
      .then((d) => setCases(Array.isArray(d.cases) ? d.cases : []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const approve = async (id: string) => {
    setBusy(id);
    try {
      // 전자직인 이미지(간단 생성) — 실제로는 등록된 직인 사용
      const c = document.createElement("canvas");
      c.width = 100; c.height = 50;
      const x = c.getContext("2d");
      if (x) { x.strokeStyle = "#c0392b"; x.lineWidth = 2; x.strokeRect(8, 8, 84, 34); x.font = "15px sans-serif"; x.fillStyle = "#c0392b"; x.fillText("변호사印", 16, 32); }
      const stamp = c.toDataURL("image/png");
      const res = await fetch(`/api/keepzip/review/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approved", stamp }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) { showToast(d?.error ?? "처리에 실패했습니다.", "error"); return; }
      showToast("전자직인 날인 완료. 발송 대기로 전환됩니다.", "success");
      load();
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">불러오는 중...</div>;
  if (cases.length === 0) {
    return <div className="text-sm text-gray-400 py-16 text-center">검수 대기 중인 내용증명이 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">개인이 결제 후 보낸 내용증명입니다. 내용을 검수하고 전자직인을 찍어 발송합니다.</p>
      {cases.map((c) => {
        const st = STATUS_LABEL[c.status] ?? { text: c.status, cls: "bg-gray-100 text-gray-500" };
        return (
          <Card key={c.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{CAUSE_LABEL[c.cause] ?? c.cause}</span>
                <span className={`text-xs rounded px-1.5 py-0.5 ${st.cls}`}>{st.text}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{c.id.slice(0, 10)} · {c.senderName} → {c.recipientName}</div>
            </div>
            <div className="flex-shrink-0">
              <Button variant="primary" loading={busy === c.id} disabled={c.status !== "lawyer_pending"} onClick={() => approve(c.id)}>
                {c.status === "lawyer_approved" ? "직인 완료" : "승인·직인"}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
