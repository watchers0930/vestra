"use client";

import { AlertCircle, X } from "lucide-react";
import { CategoryHero } from "@/components/common/CategoryHero";
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
    step, loading, error, clearError,
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
      <CategoryHero
        badge="✨ 수익성 분석"
        title="사업성 분석 보고서"
        description="다중 문서 기반 사업성 검증 보고서"
        marginBottom="20px"
      />

      {/* ── 단계 표시 ── */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "20px 24px", marginBottom: "20px" }}>
        <StepIndicator steps={STEPS} currentStep={stepToIndex(step)} />
      </div>

      {/* ── 에러 ── */}
      {error && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 18px", borderRadius: "14px", background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.18)", marginBottom: "16px" }}>
          <AlertCircle size={18} style={{ color: "#ff3b30", flexShrink: 0, marginTop: "1px" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#c0392b", margin: "0 0 2px" }}>오류가 발생했습니다</p>
            <p style={{ fontSize: "12px", color: "#e74c3c", margin: 0 }}>{error}</p>
          </div>
          <button onClick={clearError} style={{ padding: "4px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", flexShrink: 0 }}>
            <X size={16} style={{ color: "#c0392b" }} />
          </button>
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
