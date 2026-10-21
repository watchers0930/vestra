"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { BarChart3, Wallet, Shield, FileText, ArrowRight, Trash2 } from "lucide-react";
import { useDashboardData } from "@/app/(app)/dashboard/hooks/useDashboardData";
import type { AnalysisRecord } from "@/lib/store";
import { useAnalysisDetail } from "../hooks/useAnalysisDetail";
import { AnalysisDetailModal } from "./AnalysisDetailModal";
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
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const { assets, analyses, totalAssets, totalValue, avgSafety, mounted, handleDeleteAsset, handleDeleteAnalysis } = useDashboardData();
  const { openId, detail, loading, error, open, close } = useAnalysisDetail();
  // 선택 상태를 '선택 당시 사용자'에 귀속시켜 계정 전환 시 이전 계정 메타(주소·날짜)가 잔류하지 않게 한다(설계 §4.3·F04).
  const [selected, setSelected] = useState<{ record: AnalysisRecord; owner: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 경량 목록 행 클릭 시에만 서버 본인 상세·직전 비교를 조회(재분석 없음)
  function openDetail(a: AnalysisRecord) { setSelected({ record: a, owner: userId }); open(a.id); }
  function closeDetail() { close(); setSelected(null); }

  // 계정 변경 시 열린 모달을 상세 훅과 함께 닫는다(이전 계정 데이터 표시 차단)
  const prevUserRef = useRef(userId);
  useEffect(() => {
    if (prevUserRef.current === userId) return;
    prevUserRef.current = userId;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(null);
    close();
  }, [userId, close]);

  // 렌더 시점에도 선택 당시 사용자와 현재 사용자가 다르면 이전 record를 표시하지 않는다(세션 변경 레이스 방지)
  const activeSelected = selected && selected.owner === userId ? selected.record : null;

  async function onDeleteAsset(id: string | undefined, name: string) {
    if (!id) return;
    if (!confirm(`"${name}" 자산을 삭제하시겠습니까?`)) return;
    await handleDeleteAsset(id);
  }

  async function onDeleteSelected() {
    if (!activeSelected) return;
    if (!confirm("이 분석 이력을 삭제하시겠습니까?")) return;
    setDeleting(true);
    await handleDeleteAnalysis(activeSelected.id);
    setDeleting(false);
    closeDetail();
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
                onClick={() => openDetail(a)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(a); } }}
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

      {/* 분석 이력 상세·비교 모달 — 저장된 스냅샷으로 본인 상세·직전 비교·PDF (재분석 없음) */}
      {activeSelected && (
        <AnalysisDetailModal
          record={{
            id: activeSelected.id,
            type: activeSelected.type,
            typeLabel: activeSelected.typeLabel || "분석 기록",
            address: activeSelected.address || "",
            summary: activeSelected.summary || "",
            date: activeSelected.date,
          }}
          detail={openId === activeSelected.id ? detail : null}
          loading={loading}
          error={error}
          onClose={closeDetail}
          onDelete={onDeleteSelected}
          deleting={deleting}
        />
      )}
    </div>
  );
}
