"use client";

import { AlertCircle, ClipboardCheck } from "lucide-react";
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
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
            <ClipboardCheck size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1d1d1f]">사업성 분석 보고서</h1>
            <p className="text-sm text-[#6e6e73]">다중 문서 기반 사업성 검증 보고서를 생성합니다.</p>
          </div>
        </div>
      </div>

      {/* 단계 표시 */}
      <div className="px-4">
        <StepIndicator steps={STEPS} currentStep={stepToIndex(step)} />
      </div>

      {/* 에러 */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">오류가 발생했습니다</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* 1단계: 문서 업로드 */}
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

      {/* 2단계: 검증 분석 로딩 */}
      {step === "verify" && loading && <VerifyStep />}

      {/* 3단계: 보고서 결과 */}
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
