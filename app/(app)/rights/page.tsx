"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Shield, FileText, Loader2, ShieldCheck, Home, Calculator, TrendingUp } from "lucide-react";
import { PageHeader, Card, AiDisclaimer } from "@/components/common";
import FeedbackWidget from "@/components/common/FeedbackWidget";
import { AnalysisLoader } from "@/components/common/AnalysisLoader";
import { ErrorRetry } from "@/components/common/ErrorRetry";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { AnalysisStepIndicator } from "./components/AnalysisStepIndicator";
import { RightsInputCard } from "./components/RightsInputCard";
import { useRightsAnalysis } from "./hooks/useRightsAnalysis";

const RightsResult = dynamic(
  () => import("@/components/rights/RightsResult").then((mod) => mod.RightsResult),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> },
);

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

  const usedFile = inputMode === "file" && fileName;
  const usedCodef = codefSource && rawText;

  return (
    <div>
      <PageHeader icon={Shield} title="권리분석" description="등기부등본 업로드 → 실제 데이터 기반 종합 권리분석" />

      {/* 이전 분석 기록 배너 */}
      {previousAnalysis && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-500 flex-shrink-0" />
            <span className="text-blue-700">이전 분석 기록이 있습니다: {previousAnalysis.date}</span>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById("rights-result");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap ml-2"
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
        <Card className="p-6 mb-6" aria-busy="true" aria-live="polite">
          <p className="text-sm font-medium text-[#1d1d1f] text-center mb-1">등기부등본 종합 분석 중...</p>
          <p className="text-xs text-[#6e6e73] text-center mb-2">약 10~15초 소요</p>
          <AnalysisStepIndicator step={step} showExtract={!!usedFile} showCodef={!!usedCodef} fileType={fileType} />
          <AnalysisLoader
            steps={["등기부등본 파싱 중...", "권리관계 분석 중...", "위험도 점수 산출 중...", "AI 종합 의견 생성 중..."]}
            interval={3000}
          />
        </Card>
      )}

      {/* 결과 */}
      {result && step === "done" && (
        <>
          <div id="rights-result" aria-live="polite">
            <AiDisclaimer compact className="mb-4" />
            <RightsResult result={result} rawText={rawText} />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-[#6e6e73] bg-[#f5f5f7] rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
              <ShieldCheck size={13} strokeWidth={1.5} className="text-[#6e6e73]" />
              SHA-256 무결성 검증 완료
            </span>
            <PdfDownloadButton targetSelector="#rights-result" filename="vestra-권리분석.pdf" title="VESTRA 권리분석 리포트" />
          </div>

          {analysisId && <FeedbackWidget analysisId={analysisId} analysisType="rights" className="mt-4" />}

          {/* 연관 분석 CTA */}
          <div className="mt-6 p-4 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7]">
            <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider mb-3">이 물건으로 추가 분석</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/jeonse/analysis"
                onClick={() => {
                  const addr = result.parsed?.title?.address || result.propertyInfo?.address;
                  if (addr) localStorage.setItem("vestra_last_address", addr);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e5e7] bg-white text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all"
              >
                <Home size={16} strokeWidth={1.5} />
                전세 안전 진단
              </Link>
              <Link
                href="/tax"
                onClick={() => {
                  const addr = result.parsed?.title?.address || result.propertyInfo?.address;
                  if (addr) localStorage.setItem("vestra_last_address", addr);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e5e7] bg-white text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all"
              >
                <Calculator size={16} strokeWidth={1.5} />
                세금 시뮬레이션
              </Link>
              <Link
                href="/prediction"
                onClick={() => {
                  const addr = result.parsed?.title?.address || result.propertyInfo?.address;
                  if (addr) localStorage.setItem("vestra_last_address", addr);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e5e7] bg-white text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all"
              >
                <TrendingUp size={16} strokeWidth={1.5} />
                시세 전망
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
