"use client";

import { AlertCircle, X, Building2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AuthGuard } from "@/components/auth/AuthGuard";
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

  const { data: session } = useSession();
  // 사업성분석은 기업(BUSINESS) 회원 전용 — 서버 가드(lib/feasibility-guard)와 일치
  const allowed = ["BUSINESS", "ADMIN"].includes(session?.user?.role ?? "");

  return (
    <AuthGuard featureName="사업성분석">
    {!allowed ? (
      <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 20px" }}>
        <Building2 size={40} strokeWidth={1.4} style={{ color: "#2e4bd8", margin: "0 auto 16px", display: "block" }} />
        <h2 style={{ fontSize: 19, fontWeight: 700, color: "#1a1d2e", marginBottom: 10 }}>기업 회원 전용 기능입니다</h2>
        <p style={{ fontSize: 14, color: "#6b7180", lineHeight: 1.6, marginBottom: 22 }}>
          사업성분석(SCR 보고서)은 기업 회원 전용입니다.<br />마이페이지에서 기업 회원으로 전환하시면 이용하실 수 있습니다.
        </p>
        <Link href="/profile" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 12, background: "#2e4bd8", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>마이페이지로</Link>
      </div>
    ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <CategoryHero
        badge="✨ 수익성 분석"
        title="사업성 분석 보고서"
        description="다중 문서 기반 SCR 수준 사업성 검증 보고서를 자동 생성합니다"
        marginBottom="20px"
      />

      {/* ── 단계 표시 ── */}
      <div style={{
        background: "linear-gradient(135deg, #fafbff 0%, #f0f4ff 100%)",
        border: "1px solid rgba(0,113,227,0.10)",
        borderRadius: "20px",
        boxShadow: "0 2px 16px rgba(0,113,227,0.06)",
        padding: "24px 28px",
        marginBottom: "20px",
      }}>
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
    )}
    </AuthGuard>
  );
}
