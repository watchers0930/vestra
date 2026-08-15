"use client";

import Link from "next/link";
import { BarChart3, Wallet, Shield, FileText, ArrowRight } from "lucide-react";
import { useDashboardData } from "@/app/(app)/dashboard/hooks/useDashboardData";

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
    <div className="space-y-6">
      {/* 오늘 사용량 */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
          <h3 className="font-semibold">오늘 사용량</h3>
        </div>
        {usage ? (
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted">분석 횟수</span>
              <span className="font-medium">{usage.used} / {usage.limit}회</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#e5e5e7]">
              <div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }} />
            </div>
            {usage.used >= usage.limit && <p className="mt-2 text-xs text-danger">일일 사용 한도에 도달했습니다. 내일 초기화됩니다.</p>}
          </div>
        ) : (
          <div className="h-8 animate-pulse rounded-lg bg-[#e5e5e7]" />
        )}
      </div>

      {/* 요약 지표 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-2xl border border-border bg-card p-4">
              <Icon size={18} className="mb-2 text-[#0071e3]" strokeWidth={1.5} />
              <p className="text-xs text-muted">{m.label}</p>
              <p className="mt-0.5 text-lg font-bold text-[#1d1d1f]">{m.value}</p>
            </div>
          );
        })}
      </div>

      {/* 최근 분석 이력 */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">최근 분석 이력</h3>
          <Link href="/renewal/rights" className="inline-flex items-center gap-1 text-xs text-[#0071e3] hover:underline">
            분석하러 가기 <ArrowRight size={12} />
          </Link>
        </div>
        {!mounted ? (
          <div className="h-20 animate-pulse rounded-lg bg-[#e5e5e7]" />
        ) : analyses && analyses.length > 0 ? (
          <ul className="divide-y divide-[#f0f0f2]">
            {analyses.slice(0, 5).map((a: { id?: string; address?: string; createdAt?: string }, i: number) => (
              <li key={a.id || i} className="flex items-center justify-between py-2.5">
                <span className="truncate text-sm text-[#1d1d1f]">{a.address || "분석 기록"}</span>
                <span className="ml-3 flex-shrink-0 text-xs text-[#86868b]">{a.createdAt ? new Date(a.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : ""}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted">아직 분석 기록이 없습니다.</p>
        )}
      </div>

      {/* 등록 자산 요약 */}
      {mounted && assets && assets.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold">내 자산</h3>
          <ul className="divide-y divide-[#f0f0f2]">
            {assets.slice(0, 5).map((a: { id?: string; address?: string; currentValue?: number; value?: number }, i: number) => (
              <li key={a.id || i} className="flex items-center justify-between py-2.5">
                <span className="truncate text-sm text-[#1d1d1f]">{a.address || "자산"}</span>
                <span className="ml-3 flex-shrink-0 text-sm font-medium text-[#1d1d1f]">{formatEok(a.currentValue ?? a.value ?? 0)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
