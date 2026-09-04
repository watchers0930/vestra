"use client";

import s from "../realtor-home.module.css";
import type { RealtorKpi } from "../hooks/useRealtorHomeData";

interface KpiDef {
  key: keyof RealtorKpi;
  label: string;
  tick: string;
  unit: string;
  note?: (v: number) => { text: string; tone?: "up" | "warn" };
}

const KPIS: KpiDef[] = [
  { key: "listings", label: "등록 매물", tick: "#2e4bd8", unit: "건" },
  { key: "activeDeals", label: "진행중 거래", tick: "#ff9f0a", unit: "건" },
  { key: "pendingApps", label: "받은 의향서", tick: "#22c55e", unit: "건",
    note: (v) => (v > 0 ? { text: `미확인 ${v}`, tone: "up" } : { text: "대기 없음" }) },
  { key: "unreadAlerts", label: "등기감시 경보", tick: "#e04444", unit: "건",
    note: (v) => (v > 0 ? { text: "확인 필요", tone: "warn" } : { text: "이상 없음" }) },
];

export default function RealtorKpiStrip({ kpi, loading }: { kpi: RealtorKpi; loading: boolean }) {
  return (
    <div className={s.kpiStrip}>
      {KPIS.map((d) => {
        const v = kpi[d.key];
        const note = d.note?.(v);
        return (
          <div key={d.key} className={s.kpi}>
            <div className={s.kl}><span className={s.tick} style={{ background: d.tick }} />{d.label}</div>
            {loading ? (
              <div className={s.skel} style={{ height: 27, width: 64 }} />
            ) : (
              <div className={s.kv}>{v}<small>{d.unit}</small></div>
            )}
            {!loading && note && (
              <div className={`${s.kt}${note.tone === "up" ? " " + s.up : note.tone === "warn" ? " " + s.warn : ""}`}>
                {note.text}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
