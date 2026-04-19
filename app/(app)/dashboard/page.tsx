"use client";

import { Shield, FileText, TrendingUp, Search } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { EmptyState } from "@/components/common";
import { useDashboardData } from "./hooks/useDashboardData";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { DashboardTopbar } from "./components/DashboardTopbar";
import { DashboardHero } from "./components/DashboardHero";
import { DashboardKpiCard } from "./components/DashboardKpiCard";
import { QuickAccess } from "./components/QuickAccess";
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

  const safetyStatus =
    !mounted || avgSafety === 0 ? undefined
    : avgSafety >= 70 ? { trend: "양호", dir: "up" as const }
    : avgSafety >= 40 ? { trend: "보통", dir: "flat" as const }
    : { trend: "위험", dir: "down" as const };

  const riskStatus =
    !mounted || avgRisk === 0 ? undefined
    : avgRisk <= 30 ? { trend: "안전", dir: "up" as const }
    : avgRisk <= 60 ? { trend: "주의", dir: "flat" as const }
    : { trend: "고위험", dir: "down" as const };

  return (
    <div>
      {/* ── Topbar ── */}
      <DashboardTopbar monitoredCount={monitoredCount} session={session} />

      {/* ── Body ── */}
      <div className="px-9 pb-20">

        {/* Hero */}
        <div className="mt-9 mb-7">
          <DashboardHero
            session={session}
            totalAssets={totalAssets}
            totalValue={totalValue}
            avgSafety={avgSafety}
            mounted={mounted}
          />
        </div>

        {/* Info Banner */}
        <div
          className="mb-7 flex items-center gap-[12px] rounded-[13px] px-[20px] py-[14px] text-[12.5px] leading-[1.55] text-[#424245]"
          style={{
            background: "rgba(0,113,227,0.05)",
            border: "1px solid rgba(0,113,227,0.12)",
          }}
        >
          <div
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-[14px]"
            style={{ background: "rgba(0,113,227,0.10)" }}
          >
            ℹ️
          </div>
          <span>
            권리분석, 계약검토, 시세전망 등에서 분석한 결과가 이 대시보드에 자동으로 표시됩니다.
            분석은 언제든지 새로 추가할 수 있습니다.
          </span>
        </div>

        {/* KPI Cards */}
        <div className="mb-7 grid grid-cols-2 gap-[14px] xl:grid-cols-4">
          <DashboardKpiCard
            label="관리 자산"
            value={mounted ? `${totalAssets}건` : "-"}
            description="분석된 부동산 총 건수"
            icon="🏢"
            colorAccent="blue"
          />
          <DashboardKpiCard
            label="총 평가액"
            value={mounted && totalValue > 0 ? formatKRW(totalValue) : "-"}
            description="추정 시세 합계"
            icon="💰"
            colorAccent="green"
          />
          <DashboardKpiCard
            label="평균 안전지수"
            value={mounted && avgSafety > 0 ? `${avgSafety}점` : "-"}
            description="100점 만점 기준"
            icon="🛡️"
            colorAccent="orange"
            trend={safetyStatus?.trend}
            trendDir={safetyStatus?.dir}
          />
          <DashboardKpiCard
            label="평균 리스크"
            value={mounted && avgRisk > 0 ? `${avgRisk}점` : "-"}
            description="낮을수록 안전"
            icon="⚠️"
            colorAccent="red"
            trend={riskStatus?.trend}
            trendDir={riskStatus?.dir}
          />
        </div>

        {/* Quick Access */}
        <div className="mb-7">
          <div className="mb-4 text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f]">
            빠른 실행
          </div>
          <QuickAccess />
        </div>

        {/* Portfolio Overview */}
        {mounted && assets.length > 0 && (
          <div className="mb-7">
            <div className="mb-4 flex items-baseline justify-between">
              <div className="text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f]">
                포트폴리오 현황
              </div>
              <span className="text-[12.5px] font-medium text-[#0071e3] cursor-pointer">전체 보기 →</span>
            </div>
            <PortfolioOverview
              totalValue={totalValue}
              totalAssets={totalAssets}
              avgRisk={avgRisk}
              avgSafety={avgSafety}
              riskDistribution={riskDistribution}
              assetValueData={assetValueData}
            />
          </div>
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

        {/* Asset List */}
        {mounted && assets.length > 0 && (
          <div className="mb-7">
            <div className="mb-4 flex items-baseline justify-between">
              <div className="text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f]">
                등록 자산
              </div>
              <span className="text-[12.5px] font-medium text-[#0071e3] cursor-pointer">관리하기 →</span>
            </div>
            <AssetList
              assets={assets}
              session={session}
              monitoringLoading={monitoringLoading}
              monitoredAddresses={monitoredAddresses}
              handleMonitorRegister={handleMonitorRegister}
            />
          </div>
        )}

        {/* Analysis History */}
        {mounted && analyses.length > 0 && (
          <div className="mb-7">
            <div className="mb-4 flex items-baseline justify-between">
              <div className="text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f]">
                최근 분석 이력
              </div>
              <span className="text-[12.5px] font-medium text-[#0071e3] cursor-pointer">전체 보기 →</span>
            </div>
            <AnalysisHistory
              analyses={analyses}
              addressCountMap={addressCountMap}
              cascadeLoading={cascadeLoading}
              handleCascadeUpdate={handleCascadeUpdate}
              handleDeleteAnalysis={handleDeleteAnalysis}
            />
          </div>
        )}

        {/* 분석 이력 없음 (자산은 있지만 이력 없음) */}
        {mounted && !isEmpty && analyses.length === 0 && (
          <div
            className="rounded-[18px] bg-white p-8 text-center"
            style={{ border: "1px solid rgba(0,0,0,0.08)" }}
          >
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
              style={{ background: "#f5f5f7" }}
            >
              📋
            </div>
            <p className="mb-1 text-sm font-medium text-[#1d1d1f]">아직 분석 이력이 없습니다</p>
            <p className="mb-4 text-xs text-[#6e6e73]">권리분석이나 계약검토를 시작해보세요.</p>
            <a
              href="/rights"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d1d1f] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333]"
            >
              <Shield size={16} strokeWidth={1.5} />권리분석 시작
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
