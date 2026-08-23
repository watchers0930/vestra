"use client";

import { useState } from "react";
import { useToast } from "@/components/common/toast";

interface Props {
  lawyerId: string;
  lawyerName: string;
  mode: "consult" | "visit";
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

/** 전문가 상담문의 / 방문예약 신청 폼 (미니홈페이지) */
export function ExpertInquiryForm({ lawyerId, lawyerName, mode }: Props) {
  const { showToast } = useToast();
  const [f, setF] = useState({ name: "", phone: "", a: "", b: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const isConsult = mode === "consult";
  const canSubmit = f.name.trim() && f.phone.trim() && f.a.trim();

  const submit = async () => {
    setSubmitting(true);
    try {
      const url = isConsult ? "/api/keepzip/consults" : "/api/keepzip/visits";
      const body = isConsult
        ? { lawyerId, name: f.name, phone: f.phone, topic: f.a, content: f.b }
        : { lawyerId, name: f.name, phone: f.phone, preferredAt: f.a, purpose: f.b };
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => null);
      if (!res.ok) { showToast(d?.error ?? "신청에 실패했습니다.", "error"); return; }
      setDone(true);
      showToast(isConsult ? "상담문의가 접수되었습니다." : "방문예약이 접수되었습니다.", "success");
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 24, textAlign: "center", color: "#2e7d5b", background: "#eafaf1", borderRadius: 12 }}>
        {isConsult ? "상담문의" : "방문예약"}가 {lawyerName} 전문가에게 접수되었습니다.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="space-y-3">
        <input className={inputCls} placeholder="성명" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <input className={inputCls} placeholder="연락처 (010-0000-0000)" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        <input className={inputCls} placeholder={isConsult ? "상담 주제 (예: 보증금 반환)" : "희망 일시 (예: 8/28 오후 2시)"} value={f.a} onChange={(e) => set("a", e.target.value)} />
        <textarea className={`${inputCls} min-h-[100px]`} placeholder={isConsult ? "상담 내용을 적어주세요." : "방문 목적을 적어주세요."} value={f.b} onChange={(e) => set("b", e.target.value)} />
        <button
          type="button"
          disabled={!canSubmit || submitting}
          onClick={submit}
          className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-bold disabled:bg-gray-300 hover:bg-blue-700 transition-colors"
        >
          {submitting ? "신청 중..." : isConsult ? "상담 문의하기" : "방문 예약하기"}
        </button>
      </div>
    </div>
  );
}
