"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import type { OfficialPriceResult } from "@/lib/official-price-api";
import { TrendingUp, BarChart3, Home, Shield, Activity, MapPin, Zap } from "lucide-react";
import { CategoryHero } from "@/components/common/CategoryHero";
import { IntegrityBadge } from "@/components/common/IntegrityBadge";
import { ScholarPapers } from "@/components/results";
import AiDisclaimer from "@/components/common/ai-disclaimer";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { AnalysisLoader } from "@/components/common/AnalysisLoader";
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
import { KaptInfoCard } from "@/components/common/KaptInfoCard";

const TransactionMap = dynamic(
  () => import("@/components/prediction/TransactionMap"),
  { ssr: false, loading: () => <div style={{ height: "300px", borderRadius: "14px", background: "#f5f5f7", animation: "pulse 1.5s infinite" }} /> }
);
const PredictionDashboard = dynamic(
  () => import("@/components/prediction/Dashboard").then((mod) => ({ default: mod.PredictionDashboard })),
  { ssr: false, loading: () => <div style={{ height: "256px", borderRadius: "14px", background: "#f5f5f7" }} /> }
);
const RegionCompare = dynamic(
  () => import("@/components/prediction/RegionCompare").then((mod) => ({ default: mod.RegionCompare })),
  { ssr: false, loading: () => <div style={{ height: "256px", borderRadius: "14px", background: "#f5f5f7" }} /> }
);
const AnomalyDetectionView = dynamic(
  () => import("@/components/prediction/AnomalyDetectionView").then((mod) => ({ default: mod.AnomalyDetectionView })),
  { ssr: false, loading: () => <div style={{ height: "256px", borderRadius: "14px", background: "#f5f5f7" }} /> }
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

  const [officialPrice, setOfficialPrice] = useState<OfficialPriceResult | null>(null);

  useEffect(() => {
    if (!result || !address) return;
    let cancelled = false;
    fetch(`/api/official-price?address=${encodeURIComponent(address)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled) setOfficialPrice(data ?? null); })
      .catch(() => { if (!cancelled) setOfficialPrice(null); });
    return () => { cancelled = true; setOfficialPrice(null); };
  }, [result, address]);

  return (
    <div style={{ paddingBottom: "48px" }}>
      <CategoryHero
        badge="📈 시세전망"
        title="실거래 기반 AI 시세 분석 및 전망"
        description={<>실거래 데이터 + AI로 현재 시세를 분석하고<br />미래 가격을 시나리오별로 전망합니다.</>}
      />

      {/* 이전 분석 기록 배너 */}
      {previousAnalysis && (
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 18px", borderRadius: "14px",
            background: "rgba(0,113,227,0.05)", border: "1px solid rgba(0,113,227,0.16)",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart3 size={15} style={{ color: "#0071e3", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", color: "#0071e3" }}>이전 분석 기록이 있습니다: {previousAnalysis.date}</span>
          </div>
          <button
            onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth" })}
            style={{
              fontSize: "12px", fontWeight: 600, color: "#0071e3",
              background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            결과 보기 →
          </button>
        </div>
      )}

      {/* 투자 면책 안내 */}
      <div
        style={{
          padding: "10px 16px", borderRadius: "12px",
          background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.06)",
          fontSize: "11px", color: "#6e6e73", lineHeight: 1.6,
          marginBottom: "20px",
        }}
      >
        ※ 본 분석 결과는 참고용 정보이며 투자 권유가 아닙니다. VESTRA는 이를 근거로 한 투자 결과에 대해 어떠한 책임도 지지 않습니다.
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

      {result?.kaptInfo && <KaptInfoCard kaptInfo={result.kaptInfo} />}

      {/* 분석 로딩 */}
      {loading && (
        <div
          aria-busy="true"
          aria-live="polite"
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "20px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
            padding: "24px",
            marginBottom: "20px",
          }}
        >
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f", textAlign: "center", marginBottom: "4px" }}>
            시세 분석 중...
          </p>
          <AnalysisLoader
            steps={["실거래 데이터 수집 중...", "가격 지수 산출 중...", "AI 시나리오 생성 중...", "이상 탐지 분석 중..."]}
            interval={3000}
          />
        </div>
      )}

      {/* 결과 영역 */}
      {result && !loading && (
        <div ref={resultRef} style={{ display: "flex", flexDirection: "column", gap: "20px" }} aria-live="polite">

          {/* 결과 상단 액션 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
              <Suspense fallback={<div style={{ height: "256px", borderRadius: "14px", background: "#f5f5f7" }} />}>
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
              <Suspense fallback={<div style={{ height: "256px", borderRadius: "14px", background: "#f5f5f7" }} />}>
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
              <Suspense fallback={<div style={{ height: "256px", borderRadius: "14px", background: "#f5f5f7" }} />}>
                <AnomalyDetectionView
                  transactions={filteredTransactions}
                  currentPrice={filteredStats?.avgPrice ?? result.currentPrice}
                />
              </Suspense>
            </ErrorBoundary>
          )}

          <IntegrityBadge data={result?.integrity ?? null} />

          {/* 거래 분포 지도 */}
          {filteredTransactions.length > 0 && (
            <div
              style={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "20px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                padding: "24px",
              }}
            >
              <h3
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  fontSize: "13px", fontWeight: 600, color: "#6e6e73",
                  marginBottom: "14px",
                }}
              >
                <MapPin size={14} strokeWidth={1.5} style={{ color: "#1d1d1f" }} />
                거래 분포 지도
              </h3>
              <ErrorBoundary>
                <Suspense fallback={<div style={{ height: "300px", borderRadius: "14px", background: "#f5f5f7" }} />}>
                  <TransactionMap transactions={filteredTransactions} address={address} />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}

          <TransactionTable
            filteredTransactions={filteredTransactions}
            priceStats={result.priceStats}
            selectedArea={selectedArea}
            officialPrice={officialPrice}
          />

          {/* AI 분석 의견 */}
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              padding: "24px",
            }}
          >
            <h3
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                fontSize: "13px", fontWeight: 600, color: "#6e6e73",
                marginBottom: "12px",
              }}
            >
              <TrendingUp size={14} strokeWidth={1.5} style={{ color: "#1d1d1f" }} />
              AI 분석 의견
            </h3>
            <p style={{ fontSize: "13.5px", lineHeight: 1.75, color: "#1d1d1f", whiteSpace: "pre-line" }}>{result.aiOpinion}</p>
          </div>

          {/* 반영 변수 */}
          {result.variables && result.variables.length > 0 && (
            <div
              style={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "20px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                padding: "20px 24px",
              }}
            >
              <div
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  fontSize: "12px", color: "#6e6e73", marginBottom: "12px",
                }}
              >
                <Zap size={13} strokeWidth={1.5} style={{ color: "#1d1d1f" }} />
                반영 변수
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {result.variables.map((v, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "4px 12px",
                      background: "#f5f5f7",
                      color: "#1d1d1f",
                      fontSize: "11.5px",
                      borderRadius: "20px",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 이상탐지 (중복 섹션) */}
          {filteredTransactions.length >= 3 && (
            <div
              style={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "20px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                padding: "24px",
              }}
            >
              <h3
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  fontSize: "13px", fontWeight: 600, color: "#6e6e73",
                  marginBottom: "14px",
                }}
              >
                <Activity size={14} strokeWidth={1.5} style={{ color: "#1d1d1f" }} />
                시계열 이상탐지
              </h3>
              <ErrorBoundary>
                <Suspense fallback={<div style={{ height: "256px", borderRadius: "14px", background: "#f5f5f7" }} />}>
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

          {/* 면책 조항 */}
          <div
            style={{
              padding: "16px 20px", borderRadius: "14px",
              background: "rgba(255,159,10,0.05)", border: "1px solid rgba(255,159,10,0.18)",
              fontSize: "12.5px", lineHeight: 1.65, color: "#6e6e73",
            }}
          >
            <strong style={{ color: "#b86f00" }}>면책 조항 (Disclaimer)</strong><br />
            본 분석은 AI(인공지능) 기반의 참고 자료이며, 투자 조언이 아닙니다.
            실거래 데이터는 국토교통부 공공데이터를 기반으로 하나, 실시간 시세와 차이가 있을 수 있습니다.
            부동산 투자 결정 시 반드시 공인중개사, 감정평가사 등 전문가와 상담하시기 바랍니다.
            VESTRA는 본 분석 결과에 따른 투자 손실에 대해 책임을 지지 않습니다.
          </div>

          {/* 연관 분석 CTA */}
          <div
            style={{
              padding: "20px", borderRadius: "18px",
              background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <p style={{ fontSize: "10.5px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: "12px" }}>
              이 물건으로 추가 분석
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {[
                { href: "/jeonse/analysis", icon: Home,   label: "이 지역 전세 안전", onClick: () => { if (address) localStorage.setItem("vestra_last_address", address); } },
                { href: "/rights",          icon: Shield, label: "권리분석",           onClick: () => { if (address) localStorage.setItem("vestra_last_address", address); } },
              ].map(({ href, icon: Icon, label, onClick }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClick}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "9px 16px", borderRadius: "12px",
                    border: "1px solid rgba(0,0,0,0.08)", background: "#fff",
                    fontSize: "13px", fontWeight: 500, color: "#1d1d1f", textDecoration: "none",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f7"; e.currentTarget.style.borderColor = "rgba(0,113,227,0.20)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)"; }}
                >
                  <Icon size={15} strokeWidth={1.5} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
