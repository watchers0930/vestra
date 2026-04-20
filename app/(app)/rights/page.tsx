"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Shield, FileText, Loader2, ShieldCheck, Home, Calculator, TrendingUp, Layers, BarChart2, Bot, Zap, type LucideIcon } from "lucide-react";
import { AiDisclaimer } from "@/components/common";
import FeedbackWidget from "@/components/common/FeedbackWidget";
import { AnalysisLoader } from "@/components/common/AnalysisLoader";
import { ErrorRetry } from "@/components/common/ErrorRetry";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { AnalysisStepIndicator } from "./components/AnalysisStepIndicator";
import { RightsInputCard } from "./components/RightsInputCard";
import { useRightsAnalysis } from "./hooks/useRightsAnalysis";

const RightsResult = dynamic(
  () => import("@/components/rights/RightsResult").then((mod) => mod.RightsResult),
  { loading: () => <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> },
);

const FEATURE_CHIPS: { icon: LucideIcon; label: string }[] = [
  { icon: Layers,   label: "갑구·을구 분석" },
  { icon: BarChart2, label: "실거래가 연동" },
  { icon: Bot,      label: "AI 종합 의견"  },
  { icon: Zap,      label: "30초 분석"    },
];

export default function RightsAnalysisPage() {
  const {
    inputMode, setInputMode,
    rawText, setRawText,
    estimatedPrice, setEstimatedPrice,
    step, result, error, setError,
    fileName, fileType, isDragging, isExtracting,
    analysisId, previousAnalysis,
    codefAddress, setCodefAddress,
    codefFetching, codefSource, setCodefSource,
    fileInputRef,
    loadSample, handleAddressAnalyze,
    handleDrop, handleDragOver, handleDragLeave,
    handleFileChange, handleAnalyze,
  } = useRightsAnalysis();

  const usedFile  = inputMode === "file" && fileName;
  const usedCodef = codefSource && rawText;

  return (
    <div>
      {/* ── 히어로 배너 ── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "28px",
          background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)",
          marginTop: "10px",
          marginBottom: "28px",
        }}
      >
        {/* 글로우 */}
        <div style={{ pointerEvents: "none", position: "absolute", top: "-80px", right: "-20px", height: "320px", width: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.18) 0%, transparent 65%)" }} />
        {/* 격자 */}
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "36px 44px", gap: "24px" }}>
          {/* 좌측 */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 11px",
                borderRadius: "20px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#2997ff",
                background: "rgba(41,151,255,0.10)",
                border: "1px solid rgba(41,151,255,0.20)",
                marginBottom: "14px",
              }}
            >
              ⚖️ 권리분석
            </div>
            <h1
              style={{
                fontSize: "clamp(22px, 2.4vw, 32px)",
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.03em",
                color: "#fff",
                margin: 0,
              }}
            >
              등기부등본 AI 종합 분석
            </h1>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,0.42)", marginTop: "8px", marginBottom: 0 }}>
              갑구·을구 권리관계를 AI가 분석하여 위험도와<br />투자 적합성을 판단합니다.
            </p>
          </div>

          {/* 우측 — 기능 칩 */}
          <div className="hidden md:flex" style={{ flexDirection: "column", gap: "8px", flexShrink: 0 }}>
            {FEATURE_CHIPS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  minWidth: "148px",
                }}
              >
                <Icon size={15} strokeWidth={1.6} style={{ color: "rgba(255,255,255,0.65)", flexShrink: 0 }} />
                <span style={{ fontSize: "12.5px", fontWeight: 500, color: "rgba(255,255,255,0.80)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

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
            <span style={{ fontSize: "12.5px", color: "#0071e3" }}>이전 분석 기록이 있습니다: {previousAnalysis.date}</span>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById("rights-result");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            style={{ fontSize: "11.5px", fontWeight: 600, color: "#0071e3", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
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
        codefAddress={codefAddress}
        setCodefAddress={setCodefAddress}
        codefFetching={codefFetching}
        setCodefSource={setCodefSource}
        fileInputRef={fileInputRef}
        loadSample={loadSample}
        handleAddressAnalyze={handleAddressAnalyze}
        handleDrop={handleDrop}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleFileChange={handleFileChange}
        handleAnalyze={handleAnalyze}
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
          <p style={{ fontSize: "12px", color: "#aeaeb2", textAlign: "center", marginBottom: "4px" }}>약 10~15초 소요</p>
          <AnalysisStepIndicator step={step} showExtract={!!usedFile} showCodef={!!usedCodef} fileType={fileType} />
          <AnalysisLoader
            steps={["등기부등본 파싱 중...", "권리관계 분석 중...", "위험도 점수 산출 중...", "AI 종합 의견 생성 중..."]}
            interval={3000}
          />
        </div>
      )}

      {/* 결과 */}
      {result && step === "done" && (
        <>
          <div id="rights-result" aria-live="polite">
            <AiDisclaimer compact className="mb-4" />
            <RightsResult result={result} rawText={rawText} />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span
              style={{
                fontSize: "11px",
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
                fontSize: "10.5px",
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
  );
}
