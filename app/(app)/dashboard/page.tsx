"use client";

import Link from "next/link";
import { Building2, Wallet, TrendingUp, ShieldAlert, AlertTriangle, FileText, Shield, Search, Eye, Info } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { EmptyState } from "@/components/common";
import { KpiCard } from "@/components/results";
import { useDashboardData } from "./hooks/useDashboardData";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { PortfolioOverview } from "./components/PortfolioOverview";
import { AssetList } from "./components/AssetList";
import { AnalysisHistory } from "./components/AnalysisHistory";

export default function DashboardPage() {
  const {
    session, assets, analyses, mounted, loading,
    cascadeLoading, monitoredCount, monitoredAddresses, monitoringLoading,
    totalAssets, totalValue, avgSafety, avgRisk,
    riskDistribution, assetValueData, addressCountMap,
    handleDeleteAnalysis, handleCascadeUpdate, handleMonitorRegister,
  } = useDashboardData();

  if (loading) return <DashboardSkeleton />;

  const isEmpty = totalAssets === 0 && analyses.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1d1d1f]">대시보드</h1>
          <p className="mt-0.5 text-sm text-[#6e6e73]">자산 현황 및 리스크 모니터링</p>
        </div>
        {session?.user && monitoredCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
            <Eye size={14} className="text-primary" />
            <span className="text-xs font-medium text-primary">모니터링 {monitoredCount}건</span>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-primary/5 border border-primary/10">
        <Info size={16} className="text-primary shrink-0" />
        <p className="text-sm text-[#424245]">
          권리분석, 계약검토, 시세전망 등에서 분석한 결과가 이 대시보드에 자동으로 표시됩니다.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="관리 자산" value={`${totalAssets}건`} description="분석된 부동산" icon={Building2} />
        <KpiCard label="총 평가액" value={mounted ? (totalValue > 0 ? formatKRW(totalValue) : "-") : "-"} description="추정 시세 합계" icon={Wallet} />
        <KpiCard label="평균 안전지수" value={mounted && totalAssets > 0 ? `${avgSafety}/100` : "-"} description="등록 자산 평균" icon={ShieldAlert} />
        <KpiCard label="평균 리스크" value={mounted && totalAssets > 0 ? `${avgRisk}/100` : "-"} description="낮을수록 안전" icon={AlertTriangle} />
      </div>

      {/* 포트폴리오 개요 */}
      {mounted && assets.length > 0 && (
        <PortfolioOverview
          totalValue={totalValue}
          totalAssets={totalAssets}
          avgRisk={avgRisk}
          avgSafety={avgSafety}
          riskDistribution={riskDistribution}
          assetValueData={assetValueData}
        />
      )}

      {/* Empty State */}
      {mounted && isEmpty && (
        <EmptyState
          icon={Search}
          title="아직 분석한 자산이 없습니다"
          description="권리분석, 계약검토, 가치예측, 전세보호 메뉴에서 부동산을 분석하면 이 대시보드에 자동으로 표시됩니다."
          actions={[
            { href: "/rights", label: "권리분석 시작", icon: Shield },
            { href: "/contract", label: "계약검토", icon: FileText, variant: "secondary" },
            { href: "/prediction", label: "가치예측", icon: TrendingUp, variant: "secondary" },
          ]}
        />
      )}

      {/* Assets List */}
      {mounted && (
        <AssetList
          assets={assets}
          session={session}
          monitoringLoading={monitoringLoading}
          monitoredAddresses={monitoredAddresses}
          handleMonitorRegister={handleMonitorRegister}
        />
      )}

      {/* 분석 이력 없음 안내 */}
      {mounted && analyses.length === 0 && !isEmpty && (
        <div className="rounded-xl bg-white border border-gray-100 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f5f5f7] mx-auto mb-3">
            <FileText className="h-6 w-6 text-[#6e6e73]" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-[#1d1d1f] mb-1">아직 분석 이력이 없습니다</p>
          <p className="text-xs text-[#6e6e73] mb-4">권리분석이나 계약검토를 시작해보세요.</p>
          <Link href="/rights" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-sm font-medium hover:bg-[#1d1d1f]/90 transition-all">
            <Shield size={16} strokeWidth={1.5} />권리분석 시작
          </Link>
        </div>
      )}

      {/* Analysis History */}
      {mounted && (
        <AnalysisHistory
          analyses={analyses}
          addressCountMap={addressCountMap}
          cascadeLoading={cascadeLoading}
          handleCascadeUpdate={handleCascadeUpdate}
          handleDeleteAnalysis={handleDeleteAnalysis}
        />
      )}
    </div>
  );
}
