"use client";

import Link from "next/link";
import { BarChart3, Wallet, Shield, FileText, ArrowRight } from "lucide-react";
import { useDashboardData } from "@/app/(app)/dashboard/hooks/useDashboardData";
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
  const { assets, analyses, totalAssets, totalValue, avgSafety, mounted } = useDashboardData();

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
            {analyses.slice(0, 5).map((a: { id?: string; address?: string; createdAt?: string }, i: number) => (
              <div key={a.id || i} className={s.listRow}>
                <span className={s.listAddr}>{a.address || "분석 기록"}</span>
                <span className={s.listMeta}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : ""}</span>
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
                <span className={s.listVal}>{formatEok(a.currentValue ?? a.value ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
