"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Shield, FileText, TrendingUp, Building2, Banknote, AlertTriangle, ClipboardList } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { useDashboardData } from "./hooks/useDashboardData";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { DashboardKpiCard } from "./components/DashboardKpiCard";
import { DashboardWelcome } from "./components/DashboardWelcome";
import { QuickAccess } from "./components/QuickAccess";
import { PortfolioOverview } from "./components/PortfolioOverview";
import { AssetList } from "./components/AssetList";
import { AnalysisHistory } from "./components/AnalysisHistory";

// open-redirect 방어: 내부 절대경로(/ 시작, // 아님)만 허용
function safeInternalPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: sessionData } = useSession();

  // 대시보드는 로그인 후 역할 분배 허브 역할을 겸한다.
  // - ADMIN        → /admin
  // - LAWYER       → /lawyer/dashboard (변호사 전용 대시보드)
  // - PERSONAL     → 로그인 직전 보던 화면(?next=) 있으면 그곳, 없으면 /home
  // - 사업자 계정   → 대시보드 유지 (REALESTATE / RENTAL_BIZ / BUSINESS)
  useEffect(() => {
    const role = sessionData?.user?.role;
    if (!role) return;
    if (role === "ADMIN") {
      router.replace("/admin");
      return;
    }
    if (role === "LAWYER") {
      router.replace("/lawyer/dashboard");
      return;
    }
    if (role === "PERSONAL") {
      const next = safeInternalPath(new URLSearchParams(window.location.search).get("next"));
      router.replace(next || "/home");
    }
  }, [sessionData, router]);

  const {
    session, assets, analyses, mounted, loading,
    cascadeLoading, monitoredAddresses, monitoringLoading, alertAddressMap,
    totalAssets, totalValue, avgSafety, avgRisk,
    riskDistribution, assetValueData, addressCountMap,
    handleDeleteAnalysis, handleDeleteAsset, handleCascadeUpdate, handleMonitorToggle,
  } = useDashboardData();

  if (loading) return <DashboardSkeleton />;

  const isEmpty = totalAssets === 0 && analyses.length === 0;

  // ── 빈 대시보드: 웰컴 스크린
  if (mounted && isEmpty) {
    return (
      <AuthGuard featureName="대시보드">
        <div>
          <DashboardPageTopbar current="대시보드" primaryHref="/rights" primaryLabel="새 분석" />
          <DashboardWelcome userName={session?.user?.name} />
        </div>
      </AuthGuard>
    );
  }

  // ── 기존 사용자: 판단 결과를 숫자보다 앞에
  const safetyLabel =
    !mounted || avgSafety === 0 ? "-"
    : avgSafety >= 70 ? "안전 ✓"
    : avgSafety >= 40 ? "주의 ⚠"
    : "위험 ✗";

  const riskLabel =
    !mounted || avgRisk === 0 ? "-"
    : avgRisk <= 30 ? "안전 ✓"
    : avgRisk <= 60 ? "주의 ⚠"
    : "고위험 ✗";

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
    <AuthGuard featureName="대시보드">
      <div>
        <DashboardPageTopbar current="대시보드" primaryHref="/rights" primaryLabel="새 분석" />
        <div className="pb-20 pt-[52px]">

          {/* 컴팩트 헤더 */}
          <div className="mt-7 mb-6">
            <h1 className="text-[21px] font-bold tracking-[-0.02em] text-[#1d1d1f]">포트폴리오 현황</h1>
            <p className="mt-1 text-[13px] text-[#6e6e73]">분석 결과와 자산 현황을 한눈에 확인하세요.</p>
          </div>

          {/* KPI Cards */}
          <div className="mb-7 grid grid-cols-1 sm:grid-cols-2 gap-[14px] xl:grid-cols-4">
            <DashboardKpiCard
              label="관리 자산"
              value={mounted ? `${totalAssets}건` : "-"}
              description="분석된 부동산 총 건수"
              icon={Building2}
              colorAccent="blue"
            />
            <DashboardKpiCard
              label="총 평가액"
              value={mounted && totalValue > 0 ? formatKRW(totalValue) : "-"}
              description="추정 시세 합계"
              icon={Banknote}
              colorAccent="green"
            />
            <DashboardKpiCard
              label="평균 안전지수"
              value={safetyLabel}
              description={mounted && avgSafety > 0 ? `${avgSafety}점 / 100점 기준` : "100점 만점 기준"}
              icon={Shield}
              colorAccent="orange"
              trend={safetyStatus?.trend}
              trendDir={safetyStatus?.dir}
            />
            <DashboardKpiCard
              label="평균 리스크"
              value={riskLabel}
              description={mounted && avgRisk > 0 ? `리스크 ${avgRisk}점 · 낮을수록 안전` : "낮을수록 안전"}
              icon={AlertTriangle}
              colorAccent="red"
              trend={riskStatus?.trend}
              trendDir={riskStatus?.dir}
            />
          </div>

          {/* Quick Access */}
          <div className="mb-7">
            <div className="mb-4 text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f]">빠른 실행</div>
            <QuickAccess />
          </div>

          {/* Portfolio Overview */}
          {mounted && assets.length > 0 && (
            <div className="mb-7">
              <div className="mb-4 flex items-baseline justify-between">
                <div className="text-base sm:text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f]">포트폴리오 차트</div>
                <a
                  href="#registered-assets"
                  className="text-[12.5px] font-medium text-[#0071e3] transition-colors hover:text-[#005bb5] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
                >
                  전체 보기 →
                </a>
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

          {/* Asset List */}
          {mounted && assets.length > 0 && (
            <div id="registered-assets" className="mb-7 scroll-mt-24">
              <div className="mb-4 flex items-baseline justify-between">
                <div className="text-base sm:text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f]">등록 자산</div>
                <Link
                  href="/monitoring"
                  className="text-[12.5px] font-medium text-[#0071e3] transition-colors hover:text-[#005bb5] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
                >
                  관리하기 →
                </Link>
              </div>
              <AssetList
                assets={assets}
                session={session}
                monitoringLoading={monitoringLoading}
                monitoredAddresses={monitoredAddresses}
                handleMonitorToggle={handleMonitorToggle}
                handleDeleteAsset={handleDeleteAsset}
              />
            </div>
          )}

          {/* Analysis History */}
          {mounted && analyses.length > 0 && (
            <div className="mb-7">
              <div className="mb-4 flex items-baseline justify-between">
                <div className="text-base sm:text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f]">최근 분석 이력</div>
                <Link
                  href="/report"
                  className="text-[12.5px] font-medium text-[#0071e3] transition-colors hover:text-[#005bb5] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
                >
                  전체 보기 →
                </Link>
              </div>
              <AnalysisHistory
                analyses={analyses}
                addressCountMap={addressCountMap}
                cascadeLoading={cascadeLoading}
                handleCascadeUpdate={handleCascadeUpdate}
                handleDeleteAnalysis={handleDeleteAnalysis}
                alertAddressMap={alertAddressMap}
              />
            </div>
          )}

          {/* 자산은 있지만 이력 없음 */}
          {mounted && !isEmpty && analyses.length === 0 && (
            <div
              className="rounded-[18px] bg-white p-8 text-center"
              style={{ border: "1px solid rgba(0,0,0,0.08)" }}
            >
              <div
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "#f5f5f7" }}
              >
                <ClipboardList size={22} strokeWidth={1.5} style={{ color: "#6e6e73" }} />
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
    </AuthGuard>
  );
}
