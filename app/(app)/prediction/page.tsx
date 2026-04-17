"use client";

import { Suspense } from "react";
import Link from "next/link";
import { TrendingUp, BarChart3, Home, Shield, Activity, MapPin, Zap } from "lucide-react";
import { PageHeader, Card, Alert } from "@/components/common";
import { IntegrityBadge } from "@/components/common/IntegrityBadge";
import { ScholarPapers } from "@/components/results";
import AiDisclaimer from "@/components/common/ai-disclaimer";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { LoadingSpinner } from "@/components/loading";
import { PredictionTabs } from "@/components/prediction/PredictionTabs";
import { BacktestView } from "@/components/prediction/BacktestView";
import FeedbackWidget from "@/components/common/FeedbackWidget";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import dynamic from "next/dynamic";
import { usePredictionData } from "./hooks/usePredictionData";
import { AddressSearchCard } from "./components/AddressSearchCard";
import { AddressInfoCard } from "./components/AddressInfoCard";
import { TransactionFilter } from "./components/TransactionFilter";
import { TransactionTrendChart } from "./components/TransactionTrendChart";
import { ChartTab } from "./components/ChartTab";
import { TransactionTable } from "./components/TransactionTable";

const TransactionMap = dynamic(
  () => import("@/components/prediction/TransactionMap"),
  { ssr: false, loading: () => <div className="h-[300px] sm:h-[400px] animate-pulse bg-gray-100 rounded-xl" /> }
);
const PredictionDashboard = dynamic(
  () => import("@/components/prediction/Dashboard").then((mod) => ({ default: mod.PredictionDashboard })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-xl" /> }
);
const RegionCompare = dynamic(
  () => import("@/components/prediction/RegionCompare").then((mod) => ({ default: mod.RegionCompare })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-xl" /> }
);
const AnomalyDetectionView = dynamic(
  () => import("@/components/prediction/AnomalyDetectionView").then((mod) => ({ default: mod.AnomalyDetectionView })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-xl" /> }
);

export default function PredictionPage() {
  const {
    resultRef, roadResult, buildingName, address, loading, result,
    activeScenario, setActiveScenario, selectedArea, setSelectedArea,
    selectedApt, setSelectedApt, addressTab, setAddressTab, addressInfo,
    activeTab, setActiveTab, analysisId, previousAnalysis, canSearch,
    openDaumPostcode, handleAnalyze, availableApts, availableAreas,
    filteredTransactions, filteredStats, scenarios, disabledTabs,
    getChartData, getHistoricalData, getMonthlyTrendData,
  } = usePredictionData();

  return (
    <div>
      <PageHeader icon={TrendingUp} title="시세전망" description="실거래 데이터 + AI 기반 부동산 시세 분석 및 미래 가격 전망" />

      {/* 이전 분석 기록 배너 */}
      {previousAnalysis && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-500 flex-shrink-0" />
            <span className="text-blue-700">이전 분석 기록이 있습니다: {previousAnalysis.date}</span>
          </div>
          <button
            onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap ml-2"
          >
            결과 보기 →
          </button>
        </div>
      )}

      <div className="mb-6 px-4 py-2.5 bg-[#f5f5f7] border border-[#e5e5e7] rounded-lg">
        <p className="text-[11px] text-[#6e6e73] leading-relaxed">
          ※ 본 분석 결과는 참고용 정보이며 투자 권유가 아닙니다. VESTRA는 이를 근거로 한 투자 결과에 대해 어떠한 책임도 지지 않습니다.
        </p>
      </div>

      <AddressSearchCard
        roadResult={roadResult}
        loading={loading}
        canSearch={canSearch}
        openDaumPostcode={openDaumPostcode}
        handleAnalyze={handleAnalyze}
      />

      <AddressInfoCard
        address={address}
        addressInfo={addressInfo}
        addressTab={addressTab}
        setAddressTab={setAddressTab}
        buildingName={buildingName}
        selectedApt={selectedApt}
      />

      {loading && (
        <div aria-busy="true" aria-live="polite">
          <LoadingSpinner message="실거래 데이터 수집 및 AI 가치 예측 분석 중입니다..." />
        </div>
      )}

      {/* 결과 영역 */}
      {result && !loading && (
        <div ref={resultRef} className="space-y-6" aria-live="polite">
          <div className="flex items-center justify-between">
            <AiDisclaimer compact />
            <PdfDownloadButton targetRef={resultRef} filename="vestra-prediction.pdf" title="VESTRA 시세전망 리포트" />
          </div>

          <TransactionFilter
            availableApts={availableApts}
            availableAreas={availableAreas}
            selectedApt={selectedApt}
            setSelectedApt={setSelectedApt}
            selectedArea={selectedArea}
            setSelectedArea={setSelectedArea}
          />

          <TransactionTrendChart
            trendData={getMonthlyTrendData()}
            totalTransactions={filteredTransactions.length}
            selectedApt={selectedApt}
            selectedArea={selectedArea}
          />

          <PredictionTabs activeTab={activeTab} onTabChange={setActiveTab} disabledTabs={disabledTabs} />

          {activeTab === "dashboard" && (
            <ErrorBoundary>
              <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-xl" />}>
                <PredictionDashboard
                  result={filteredStats && selectedArea !== null
                    ? { ...result, currentPrice: filteredStats.avgPrice } as never
                    : result as never}
                  address={address}
                />
              </Suspense>
            </ErrorBoundary>
          )}

          {activeTab === "chart" && (
            <ChartTab
              result={result}
              historicalData={getHistoricalData()}
              chartData={getChartData()}
              activeScenario={activeScenario}
              setActiveScenario={setActiveScenario}
              filteredTransactions={filteredTransactions}
              filteredStats={filteredStats}
              scenarios={scenarios}
            />
          )}

          {activeTab === "compare" && (
            <ErrorBoundary>
              <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-xl" />}>
                <RegionCompare primaryResult={result ? {
                  address: address,
                  currentPrice: result.currentPrice,
                  prediction1y: result.predictions.base["1y"],
                  confidence: result.confidence,
                } : undefined} />
              </Suspense>
            </ErrorBoundary>
          )}

          {activeTab === "backtest" && result.backtestResult && (
            <BacktestView result={result.backtestResult} />
          )}

          {activeTab === "anomaly" && filteredTransactions.length >= 3 && (
            <ErrorBoundary>
              <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-xl" />}>
                <AnomalyDetectionView
                  transactions={filteredTransactions}
                  currentPrice={filteredStats?.avgPrice ?? result.currentPrice}
                />
              </Suspense>
            </ErrorBoundary>
          )}

          <IntegrityBadge data={result?.integrity ?? null} />

          {filteredTransactions.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin size={16} strokeWidth={1.5} />거래 분포 지도
              </h3>
              <ErrorBoundary>
                <Suspense fallback={<div className="h-[300px] sm:h-[400px] animate-pulse bg-gray-100 rounded-xl" />}>
                  <TransactionMap transactions={filteredTransactions} address={address} />
                </Suspense>
              </ErrorBoundary>
            </Card>
          )}

          <TransactionTable
            filteredTransactions={filteredTransactions}
            priceStats={result.priceStats}
            selectedArea={selectedArea}
          />

          <div className="bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl p-6">
            <h3 className="font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
              <TrendingUp size={20} strokeWidth={1.5} />AI 분석 의견
            </h3>
            <p className="text-[#1d1d1f] text-sm leading-relaxed whitespace-pre-line">{result.aiOpinion}</p>
          </div>

          {result.variables && result.variables.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-secondary mb-3">
                <Zap size={16} strokeWidth={1.5} />반영 변수
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.variables.map((v, i) => (
                  <span key={i} className="px-2.5 py-1 bg-[#f5f5f7] text-[#1d1d1f] text-xs rounded-full">{v}</span>
                ))}
              </div>
            </Card>
          )}

          {filteredTransactions.length >= 3 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Activity size={16} strokeWidth={1.5} />시계열 이상탐지
              </h3>
              <ErrorBoundary>
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-xl" />}>
                  <AnomalyDetectionView
                    transactions={filteredTransactions}
                    currentPrice={filteredStats?.avgPrice ?? result.currentPrice}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}

          {analysisId && (
            <FeedbackWidget analysisId={analysisId} analysisType="prediction" className="py-3" />
          )}

          <ScholarPapers keywords={["부동산 가격예측", "실거래가", addressInfo?.admin?.split(" ").slice(0, 2).join(" ") || "부동산"].filter(Boolean)} />

          <Alert variant="warning">
            <strong>면책 조항 (Disclaimer)</strong><br />
            본 분석은 AI(인공지능) 기반의 참고 자료이며, 투자 조언이 아닙니다.
            실거래 데이터는 국토교통부 공공데이터를 기반으로 하나, 실시간 시세와 차이가 있을 수 있습니다.
            부동산 투자 결정 시 반드시 공인중개사, 감정평가사 등 전문가와 상담하시기 바랍니다.
            VESTRA는 본 분석 결과에 따른 투자 손실에 대해 책임을 지지 않습니다.
          </Alert>

          <div className="mt-6 p-4 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7]">
            <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider mb-3">이 물건으로 추가 분석</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/jeonse/analysis" onClick={() => { if (address) localStorage.setItem("vestra_last_address", address); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e5e7] bg-white text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all">
                <Home size={16} strokeWidth={1.5} />이 지역 전세 안전
              </Link>
              <Link href="/rights" onClick={() => { if (address) localStorage.setItem("vestra_last_address", address); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e5e7] bg-white text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all">
                <Shield size={16} strokeWidth={1.5} />권리분석
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
