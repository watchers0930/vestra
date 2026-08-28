"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarClock } from "lucide-react";
import s from "../profile-renewal.module.css";
import { useToast } from "@/components/common/toast";

interface MyConsult {
  id: string;
  lawyerName: string;
  topic: string;
  content: string;
  status: string;
  preferredAt: string | null;
  proposedAt: string | null;
  proposeMemo: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

const ST: Record<string, { t: string; cls: string }> = {
  pending: { t: "응답 대기", cls: s.stPending },
  accepted: { t: "수락됨", cls: s.stAccepted },
  proposed: { t: "변호사 시간 제안", cls: s.stPending },
  confirmed: { t: "확정", cls: s.stAccepted },
  rejected: { t: "취소", cls: s.stWithdrawn },
  answered: { t: "완료", cls: s.stAccepted },
};

/** 마이페이지 — 내가 신청한 상담 진행상황·확정시간 + 변호사 제안 수락 */
export default function ProfileConsultsPanel() {
  const { showToast } = useToast();
  const [items, setItems] = useState<MyConsult[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/keepzip/consults");
      const d = r.ok ? await r.json() : { consults: [] };
      setItems(Array.isArray(d.consults) ? d.consults : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const confirm = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/keepzip/consults/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) { showToast(d?.error ?? "처리에 실패했습니다.", "error"); return; }
      showToast("제안하신 시간으로 상담이 확정되었습니다.", "success");
      load();
    } catch { showToast("네트워크 오류가 발생했습니다.", "error"); } finally { setBusy(null); }
  };

  if (loading) return <div className={s.emptyRow}>불러오는 중…</div>;
  if (items.length === 0) {
    return (
      <div className={s.emptyBox}>
        <CalendarClock size={30} strokeWidth={1.3} className={s.emptyIco} />
        <p className={s.emptyTitle}>신청한 상담이 없습니다</p>
        <p style={{ fontSize: 13, color: "#aab" }}>전문가에게 상담을 신청하면 진행상황이 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <>
      <p className={s.cardDesc} style={{ marginBottom: 16 }}>신청한 상담의 확정 시간과 진행상황을 확인하세요.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((c) => {
        const st = ST[c.status] ?? ST.pending;
        return (
          <div key={c.id} className={s.appCard}>
            <div className={s.appTop}>
              <div className={s.appTopInfo}>
                <div className={s.appTitle}>{c.topic}</div>
                <div className={s.appSub}>{c.lawyerName} 변호사 · 전화 상담</div>
              </div>
              <span className={`${s.statusPill} ${st.cls}`}>{st.t}</span>
            </div>
            <div className={s.appGrid}>
              <div className={s.gCol}><p className={s.gLabel}>희망 시간</p><p className={s.gVal}>{fmt(c.preferredAt)}</p></div>
              {c.status === "proposed" && (
                <div className={s.gCol}><p className={s.gLabel}>변호사 제안</p><p className={`${s.gVal} ${s.gAccent}`}>{fmt(c.proposedAt)}</p></div>
              )}
              {(c.status === "accepted" || c.status === "confirmed") && (
                <div className={s.gCol}><p className={s.gLabel}>확정 시간</p><p className={`${s.gVal} ${s.gAccent}`}>{fmt(c.confirmedAt)}</p></div>
              )}
            </div>
            {c.status === "proposed" && c.proposeMemo && (
              <div className={s.noteBox} style={{ marginBottom: 12, background: "#f6f7fb", border: "1px solid #e8eaf2", color: "#555" }}>
                <p className={s.noteLabel}>변호사 메모</p>
                {c.proposeMemo}
              </div>
            )}
            {c.status === "proposed" && (
              <div className={s.appFoot}>
                <span className={s.footDate}>변호사가 다른 시간을 제안했습니다</span>
                <button className={s.actAccept} disabled={busy === c.id} onClick={() => confirm(c.id)}>이 시간 수락</button>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </>
  );
}
