"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Wallet, Shield, FileText, ArrowRight, Trash2, X, MapPin, Calendar } from "lucide-react";
import { useDashboardData } from "@/app/(app)/dashboard/hooks/useDashboardData";
import { extractKeyMetrics } from "@/app/(app)/dashboard/components/AnalysisHistory";
import type { AnalysisRecord } from "@/lib/store";
import s from "../profile-renewal.module.css";

interface Props {
  usage: { used: number; limit: number } | null;
}

function formatEok(won: number): string {
  if (!won) return "0원";
  const eok = Math.floor(won / 100_000_000);
  const man = Math.floor((won % 100_000_000) / 10_000);
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

export default function ProfileDashboardPanel({ usage }: Props) {
  const { assets, analyses, totalAssets, totalValue, avgSafety, mounted, handleDeleteAsset, handleDeleteAnalysis } = useDashboardData();
  const [selected, setSelected] = useState<AnalysisRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function onDeleteAsset(id: string | undefined, name: string) {
    if (!id) return;
    if (!confirm(`"${name}" 자산을 삭제하시겠습니까?`)) return;
    await handleDeleteAsset(id);
  }

  async function onDeleteSelected() {
    if (!selected) return;
    if (!confirm("이 분석 이력을 삭제하시겠습니까?")) return;
    setDeleting(true);
    await handleDeleteAnalysis(selected.id);
    setDeleting(false);
    setSelected(null);
  }

  const metrics = [
    { icon: Wallet, label: "등록 자산", value: `${totalAssets ?? 0}건` },
    { icon: BarChart3, label: "총 자산가치", value: formatEok(totalValue ?? 0) },
    { icon: Shield, label: "평균 안전도", value: avgSafety != null ? `${Math.round(avgSafety)}점` : "-" },
    { icon: FileText, label: "누적 분석", value: `${analyses?.length ?? 0}건` },
  ];

  return (
    <div>
      {/* KPI */}
      <div className={s.kpiRow}>
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={s.kpiCard}>
              <Icon size={20} strokeWidth={1.5} className={s.kpiIco} />
              <p className={s.kpiLabel}>{m.label}</p>
              <p className={s.kpiVal}>{m.value}</p>
            </div>
          );
        })}
      </div>

      {/* 오늘 사용량 */}
      <div className={s.card}>
        <div className={s.cardHead}>
          <div className={s.cardHeadL}>
            <BarChart3 size={18} strokeWidth={1.5} className={s.cardIco} />
            <h3 className={s.cardTitle}>오늘 사용량</h3>
          </div>
        </div>
        {usage ? (
          <div>
            <div className={s.usageRow}>
              <span className={s.usageMuted}>분석 횟수</span>
              <span className={s.usageVal}>{usage.used} / {usage.limit}회</span>
            </div>
            <div className={s.usageTrack}>
              <div className={s.usageFill} style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }} />
            </div>
            {usage.used >= usage.limit && <p className={s.usageWarn}>일일 사용 한도에 도달했습니다. 내일 초기화됩니다.</p>}
          </div>
        ) : (
          <div className={s.skel} style={{ height: 32 }} />
        )}
      </div>

      {/* 최근 분석 이력 */}
      <div className={s.card}>
        <div className={s.cardHead}>
          <div className={s.cardHeadL}>
            <FileText size={18} strokeWidth={1.5} className={s.cardIco} />
            <h3 className={s.cardTitle}>최근 분석 이력</h3>
          </div>
          <Link href="/renewal/rights" className={s.linkR}>
            분석하러 가기 <ArrowRight size={12} />
          </Link>
        </div>
        {!mounted ? (
          <div className={s.skel} style={{ height: 80 }} />
        ) : analyses && analyses.length > 0 ? (
          <div className={s.list}>
            {analyses.slice(0, 5).map((a: AnalysisRecord, i: number) => (
              <div
                key={a.id || i}
                className={s.listRow}
                onClick={() => setSelected(a)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(a); } }}
                style={{ cursor: "pointer" }}
                title="클릭하면 저장된 상세 결과를 다시 볼 수 있습니다"
              >
                <span className={s.listAddr}>{a.address || a.typeLabel || "분석 기록"}</span>
                <span className={s.listMeta}>{a.date ? new Date(a.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : ""}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={s.emptyRow}>아직 분석 기록이 없습니다.</p>
        )}
      </div>

      {/* 내 자산 */}
      {mounted && assets && assets.length > 0 && (
        <div className={s.card}>
          <div className={s.cardHead}>
            <div className={s.cardHeadL}>
              <Wallet size={18} strokeWidth={1.5} className={s.cardIco} />
              <h3 className={s.cardTitle}>내 자산</h3>
            </div>
          </div>
          <div className={s.list}>
            {assets.slice(0, 5).map((a: { id?: string; address?: string; currentValue?: number; value?: number }, i: number) => (
              <div key={a.id || i} className={s.listRow}>
                <span className={s.listAddr}>{a.address || "자산"}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <span className={s.listVal}>{formatEok(a.currentValue ?? a.value ?? 0)}</span>
                  <button
                    type="button"
                    onClick={() => onDeleteAsset(a.id, a.address || "자산")}
                    title="자산 삭제"
                    aria-label="자산 삭제"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, border: "none", background: "transparent", color: "#b0b0b5", cursor: "pointer", borderRadius: 6 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 분석 이력 상세 재열람 모달 — 저장된 결과를 재분석 없이 다시 확인 */}
      {selected && (() => {
        const metrics = extractKeyMetrics(selected.type, selected.data);
        return (
          <div
            onClick={() => setSelected(null)}
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f" }}>{selected.typeLabel}</span>
                <button onClick={() => setSelected(null)} aria-label="닫기" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#86868b", display: "inline-flex", padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#f5f5f7", borderRadius: 12, padding: "10px 14px" }}>
                  <MapPin size={14} style={{ color: "#86868b", marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#1d1d1f" }}>{selected.address || "주소 정보 없음"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#86868b" }}>
                  <Calendar size={13} />
                  {selected.date ? `${new Date(selected.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} 분석` : "분석 일자 미상"}
                </div>
                {metrics.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {metrics.map((m) => (
                      <div key={m.label} style={{ background: "#f5f5f7", borderRadius: 12, padding: "10px 14px" }}>
                        <div style={{ fontSize: 10.5, color: "#86868b", marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "#86868b", marginBottom: 8 }}>분석 요약</p>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#1d1d1f" }}>{selected.summary || "요약 정보가 없습니다."}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid #f0f0f0" }}>
                <Link href="/renewal/rights" style={{ fontSize: 13, fontWeight: 600, color: "#2e4bd8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  새 분석 하기 <ArrowRight size={13} />
                </Link>
                <button
                  onClick={onDeleteSelected}
                  disabled={deleting}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "#ff3b30", background: "transparent", border: "1px solid rgba(255,59,48,0.3)", borderRadius: 8, padding: "6px 12px", cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.6 : 1 }}
                >
                  <Trash2 size={14} /> {deleting ? "삭제 중..." : "이력 삭제"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
