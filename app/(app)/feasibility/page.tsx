"use client";

import { AlertCircle, ClipboardCheck, Sparkles } from "lucide-react";
import { StepIndicator } from "@/components/loading/StepIndicator";
import { UploadStep } from "./components/UploadStep";
import { VerifyStep } from "./components/VerifyStep";
import { ReportStep } from "./components/ReportStep";
import { useFeasibilityAnalysis } from "./hooks/useFeasibilityAnalysis";

const STEPS = ["문서 업로드", "검증 분석", "보고서 생성"];

function stepToIndex(step: "upload" | "verify" | "report"): number {
  return step === "upload" ? 0 : step === "verify" ? 1 : 2;
}

export default function FeasibilityPage() {
  const {
    step, loading, error,
    categorizedFiles, projectType, setProjectType,
    conflicts, parsedInfo,
    verifications, rationalityItems,
    chapters, vScore, reportHtml,
    handleCategorizedFilesChange,
    handleParse, handleConflictsResolved,
    handleOpenReport, handleReset,
  } = useFeasibilityAnalysis();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── 히어로 배너 ── */}
      <section style={{ position: "relative", overflow: "hidden", borderRadius: "24px", background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)", marginTop: "10px", marginBottom: "20px" }}>
        <div style={{ pointerEvents: "none", position: "absolute", top: "-60px", right: "-20px", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.20) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", bottom: "-40px", left: "30%", width: "160px", height: "160px", borderRadius: "50%", background: "radial-gradient(circle, rgba(41,151,255,0.10) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", padding: "22px 28px", gap: "16px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "rgba(0,113,227,0.20)", border: "1px solid rgba(0,113,227,0.30)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ClipboardCheck size={20} strokeWidth={1.5} style={{ color: "#2997ff" }} />
          </div>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#2997ff", background: "rgba(41,151,255,0.10)", border: "1px solid rgba(41,151,255,0.20)", marginBottom: "5px" }}>
              <Sparkles size={8} strokeWidth={2} /> 수익성 분석
            </div>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>사업성 분석 보고서</h2>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "3px 0 0", lineHeight: 1.4 }}>다중 문서 기반 사업성 검증 보고서</p>
          </div>
        </div>
      </section>

      {/* ── 단계 표시 ── */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "20px 24px", marginBottom: "20px" }}>
        <StepIndicator steps={STEPS} currentStep={stepToIndex(step)} />
      </div>

      {/* ── 에러 ── */}
      {error && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 18px", borderRadius: "14px", background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.18)", marginBottom: "16px" }}>
          <AlertCircle size={18} style={{ color: "#ff3b30", flexShrink: 0, marginTop: "1px" }} />
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#c0392b", margin: "0 0 2px" }}>오류가 발생했습니다</p>
            <p style={{ fontSize: "12px", color: "#e74c3c", margin: 0 }}>{error}</p>
          </div>
        </div>
      )}

      {/* ── 1단계: 문서 업로드 ── */}
      {step === "upload" && (
        <UploadStep
          projectType={projectType}
          setProjectType={setProjectType}
          categorizedFiles={categorizedFiles}
          onFilesChange={handleCategorizedFilesChange}
          parsedInfo={parsedInfo}
          conflicts={conflicts}
          loading={loading}
          onParse={handleParse}
          onConflictsResolved={handleConflictsResolved}
        />
      )}

      {/* ── 2단계: 검증 로딩 ── */}
      {step === "verify" && loading && <VerifyStep />}

      {/* ── 3단계: 보고서 결과 ── */}
      {step === "report" && vScore && (
        <ReportStep
          vScore={vScore}
          chapters={chapters}
          verifications={verifications}
          rationalityItems={rationalityItems}
          reportHtml={reportHtml}
          loading={loading}
          onOpenReport={handleOpenReport}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
