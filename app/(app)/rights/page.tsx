"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FileText, Loader2, ShieldCheck, Home, Calculator, TrendingUp, AlertTriangle } from "lucide-react";
import { AiDisclaimer } from "@/components/common";
import { CategoryHero } from "@/components/common/CategoryHero";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import FeedbackWidget from "@/components/common/FeedbackWidget";
import { AnalysisLoader } from "@/components/common/AnalysisLoader";
import { ErrorRetry } from "@/components/common/ErrorRetry";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { AnalysisStepIndicator } from "./components/AnalysisStepIndicator";
import { RightsInputCard } from "./components/RightsInputCard";
import { MonitoringRegisterButton } from "./components/MonitoringRegisterButton";
import { useRightsAnalysis } from "./hooks/useRightsAnalysis";

const RightsResult = dynamic(
  () => import("@/components/rights/RightsResult").then((mod) => mod.RightsResult),
  { loading: () => <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> },
);

export default function RightsAnalysisPage() {
  const {
    inputMode, setInputMode,
    rawText, setRawText,
    estimatedPrice, setEstimatedPrice,
    step, result, error, setError,
    fileName, fileType, isDragging, isExtracting,
    analysisId, previousAnalysis,
    tilkoAddress, setTilkoAddress,
    tilkoFetching, tilkoSource, setTilkoSource,
    fileInputRef,
    loadSample, handleAddressAnalyze,
    handleDrop, handleDragOver, handleDragLeave,
    handleFileChange, handleAnalyze, applyIssuedRegistryAnalysis,
    ownerMatch, registryOwnerMasked,
  } = useRightsAnalysis();

  const usedFile  = inputMode === "file" && fileName;
  const usedTilko = tilkoSource && rawText;

  return (
    <div>
      <DashboardPageTopbar current="권리분석" primaryHref="/contract" primaryLabel="계약검토" />
      <div className="pt-[52px]">
        <CategoryHero
          badge="⚖️ 권리분석"
          title="등기부등본 AI 종합 분석"
          description={<>갑구·을구 권리관계를 AI가 분석하여 위험도와<br />투자 적합성을 판단합니다.</>}
        />

      {/* 이전 분석 기록 배너 */}
      {previousAnalysis && (
        <div
          className="mb-6"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            borderRadius: "13px",
            background: "rgba(0,113,227,0.05)",
            border: "1px solid rgba(0,113,227,0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={15} style={{ color: "#0071e3", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", color: "#0071e3" }}>이전 분석 기록이 있습니다: {previousAnalysis.date}</span>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById("rights-result");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            style={{ fontSize: "13px", fontWeight: 600, color: "#0071e3", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            결과 보기 →
          </button>
        </div>
      )}

      <RightsInputCard
        inputMode={inputMode}
        setInputMode={setInputMode}
        rawText={rawText}
        setRawText={setRawText}
        estimatedPrice={estimatedPrice}
        setEstimatedPrice={setEstimatedPrice}
        step={step}
        fileName={fileName}
        isDragging={isDragging}
        isExtracting={isExtracting}
        tilkoAddress={tilkoAddress}
        setTilkoAddress={setTilkoAddress}
        tilkoFetching={tilkoFetching}
        setTilkoSource={setTilkoSource}
        fileInputRef={fileInputRef}
        loadSample={loadSample}
        handleAddressAnalyze={handleAddressAnalyze}
        handleDrop={handleDrop}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleFileChange={handleFileChange}
        handleAnalyze={handleAnalyze}
        applyIssuedRegistryAnalysis={applyIssuedRegistryAnalysis}
      />

      {/* 에러 */}
      {error && (
        <div className="mb-6" role="alert">
          <ErrorRetry
            message={error}
            detail="입력 내용을 확인하거나 다시 시도해주세요."
            onRetry={() => { setError(null); }}
          />
        </div>
      )}

      {/* 분석 진행 중 */}
      {step !== "idle" && step !== "done" && !error && (
        <div
          className="mb-6"
          aria-busy="true"
          aria-live="polite"
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "20px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
            padding: "24px",
          }}
        >
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f", textAlign: "center", marginBottom: "4px" }}>등기부등본 종합 분석 중...</p>
          <p style={{ fontSize: "13px", color: "#aeaeb2", textAlign: "center", marginBottom: "4px" }}>약 10~15초 소요</p>
          <AnalysisStepIndicator step={step} showExtract={!!usedFile} showTilko={!!usedTilko} fileType={fileType} />
          <AnalysisLoader
            steps={["등기부등본 파싱 중...", "권리관계 분석 중...", "위험도 점수 산출 중...", "AI 종합 의견 생성 중..."]}
            interval={3000}
          />
        </div>
      )}

      {/* 결과 — 소유자 불일치 차단 */}
      {result && step === "done" && ownerMatch === false && (
        <div
          className="mb-6"
          style={{
            borderRadius: "20px",
            border: "1.5px solid #ff3b30",
            background: "rgba(255,59,48,0.04)",
            padding: "32px 28px",
            textAlign: "center",
          }}
        >
          <AlertTriangle size={36} style={{ color: "#ff3b30", margin: "0 auto 16px" }} />
          <p style={{ fontSize: "17px", fontWeight: 800, color: "#1d1d1f", marginBottom: "10px" }}>
            소유자 불일치 — 분석 결과 제공 불가
          </p>
          <p style={{ fontSize: "13px", color: "#3c3c43", lineHeight: 1.65, marginBottom: "18px" }}>
            입력하신 소유자명이 등기부에 기재된 실제 소유자와 다릅니다.<br />
            임대인이 해당 부동산의 실제 소유자가 아닐 수 있으니 주의하세요.
          </p>
          <div
            style={{
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: "12px",
              background: "rgba(255,59,48,0.08)",
              border: "1px solid rgba(255,59,48,0.20)",
              marginBottom: "20px",
            }}
          >
            <p style={{ fontSize: "13px", color: "#86868b", marginBottom: "4px" }}>등기부상 소유자 (성만 공개)</p>
            <p style={{ fontSize: "22px", fontWeight: 900, color: "#ff3b30", letterSpacing: "0.08em" }}>
              {registryOwnerMasked || "확인 불가"}
            </p>
          </div>
          <p style={{ fontSize: "13px", color: "#aeaeb2", lineHeight: 1.6 }}>
            정보 입력 오류로 인한 환불은 불가합니다.<br />
            올바른 소유자명을 확인 후 재신청해 주세요.
          </p>
        </div>
      )}

      {/* 결과 — 소유자 일치 또는 파일/텍스트 분석 */}
      {result && step === "done" && ownerMatch !== false && (
        <>
          <div id="rights-result" aria-live="polite">
            <AiDisclaimer compact className="mb-4" />
            <RightsResult result={result} rawText={rawText} />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span
              style={{
                fontSize: "13px",
                color: "#6e6e73",
                background: "#f5f5f7",
                borderRadius: "8px",
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ShieldCheck size={13} strokeWidth={1.5} />
              SHA-256 무결성 검증 완료
            </span>
            <PdfDownloadButton targetSelector="#rights-result" filename="vestra-권리분석.pdf" title="VESTRA 권리분석 리포트" />
          </div>

          {analysisId && <FeedbackWidget analysisId={analysisId} analysisType="rights" className="mt-4" />}

          {/* 연관 분석 CTA */}
          <div
            className="mt-6"
            style={{
              padding: "20px",
              borderRadius: "18px",
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#aeaeb2",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              이 물건으로 추가 분석
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {(result.parsed?.title?.address || result.propertyInfo?.address) && (
                <MonitoringRegisterButton
                  address={result.parsed?.title?.address || result.propertyInfo?.address}
                />
              )}
              {[
                { href: "/jeonse/analysis", icon: Home,       label: "전세 안전 진단" },
                { href: "/tax",             icon: Calculator,  label: "세금 시뮬레이션" },
                { href: "/prediction",      icon: TrendingUp,  label: "시세 전망"      },
              ].map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => {
                    const addr = result.parsed?.title?.address || result.propertyInfo?.address;
                    if (addr) localStorage.setItem("vestra_last_address", addr);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "#fff",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#1d1d1f",
                    textDecoration: "none",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f5f5f7";
                    e.currentTarget.style.borderColor = "rgba(0,113,227,0.20)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
                  }}
                >
                  <Icon size={15} strokeWidth={1.5} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
