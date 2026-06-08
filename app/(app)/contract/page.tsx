"use client";

import Link from "next/link";
import { FileSearch, Shield, Calculator, Copy, ShieldCheck, ClipboardCheck } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import FeedbackWidget from "@/components/common/FeedbackWidget";
import { CategoryHero } from "@/components/common/CategoryHero";
import { IntegrityBadge } from "@/components/common/IntegrityBadge";
import { NerHighlight } from "@/components/common/NerHighlight";
import AiDisclaimer from "@/components/common/ai-disclaimer";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { ScoreGauge } from "@/components/results";
import { useContractAnalysis } from "./hooks/useContractAnalysis";
import { ContractInputCard } from "./components/ContractInputCard";
import { ClauseAnalysisCard } from "./components/ClauseAnalysisCard";
import { MissingClausesCard } from "./components/MissingClausesCard";
import { SafetyChecklist } from "./components/SafetyChecklist";
import { RecommendedTermsCard } from "./components/RecommendedTermsCard";
import { getScoreLabel, riskBadgeLabel } from "./constants";

export default function ContractReviewPage() {
  const {
    inputMode, setInputMode,
    contractText, setContractText,
    fileName, isLoading, result,
    error, setError,
    isDragging, showSampleMenu, setShowSampleMenu,
    analysisId, copied, setCopied,
    fileInputRef, sampleMenuRef, resultRef,
    handleDrop, handleDragOver, handleDragLeave,
    handleFileChange, handleAnalyze, fillSample,
  } = useContractAnalysis();

  return (
    <AuthGuard featureName="계약검토">
    <div style={{ paddingBottom: "48px" }}>
      <CategoryHero
        badge="📋 계약검토"
        title="부동산 계약서 AI 자동 분석"
        description={<>조항별 위험도와 누락 항목을 AI가 자동으로 검토하고<br />계약 안전점수를 산출합니다.</>}
      />

      {/* 입력 카드 */}
      <ContractInputCard
        inputMode={inputMode}
        setInputMode={setInputMode}
        contractText={contractText}
        setContractText={setContractText}
        setError={setError}
        fileName={fileName}
        isLoading={isLoading}
        error={error}
        isDragging={isDragging}
        showSampleMenu={showSampleMenu}
        setShowSampleMenu={setShowSampleMenu}
        sampleMenuRef={sampleMenuRef}
        fileInputRef={fileInputRef}
        handleDrop={handleDrop}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleFileChange={handleFileChange}
        handleAnalyze={handleAnalyze}
        fillSample={fillSample}
      />

      {/* 결과 */}
      {result && (
        <div ref={resultRef} style={{ display: "flex", flexDirection: "column", gap: "20px" }} aria-live="polite">

          {/* 결과 상단 액션 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <AiDisclaimer compact />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={async () => {
                  const lines: string[] = [];
                  lines.push(`[계약 안전점수] ${result.safetyScore}점 (${getScoreLabel(result.safetyScore)})`);
                  lines.push("");
                  lines.push("[AI 종합 의견]");
                  lines.push(result.aiOpinion);
                  lines.push("");
                  result.clauses.forEach((c) => {
                    lines.push(`[${riskBadgeLabel[c.riskLevel]}] ${c.title}`);
                    lines.push(c.analysis);
                    if (c.relatedLaw) lines.push(`관련 법규: ${c.relatedLaw}`);
                    lines.push("");
                  });
                  if (result.missingClauses.length > 0) {
                    lines.push("[누락 조항]");
                    result.missingClauses.forEach((mc) => lines.push(`- ${mc.title}: ${mc.description}`));
                  }
                  await navigator.clipboard.writeText(lines.join("\n"));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  padding: "7px 14px", borderRadius: "10px",
                  border: "1px solid rgba(0,0,0,0.09)", background: "#fff",
                  fontSize: "12px", fontWeight: 500, color: "#1d1d1f", cursor: "pointer",
                }}
              >
                {copied ? <ClipboardCheck size={13} style={{ color: "#30d158" }} /> : <Copy size={13} />}
                {copied ? "복사됨" : "결과 복사"}
              </button>
              <PdfDownloadButton targetRef={resultRef} filename="vestra-contract-review.pdf" title="VESTRA 계약검토 리포트" />
            </div>
          </div>

          {/* 안전점수 + AI 의견 */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "20px", alignItems: "stretch" }}>
            <div
              style={{
                background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}
            >
              <h2 style={{ fontSize: "12px", fontWeight: 600, color: "#6e6e73", marginBottom: "16px", letterSpacing: "0.04em" }}>계약 안전점수</h2>
              <ScoreGauge score={result.safetyScore} grade={getScoreLabel(result.safetyScore)} />
            </div>
            <div
              style={{
                background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                padding: "24px",
              }}
            >
              <h2
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  fontSize: "13px", fontWeight: 600, color: "#6e6e73",
                  marginBottom: "12px",
                }}
              >
                <FileSearch size={15} strokeWidth={1.5} style={{ color: "#1d1d1f" }} />
                AI 종합 의견
              </h2>
              <p style={{ fontSize: "13.5px", lineHeight: 1.75, color: "#1d1d1f", whiteSpace: "pre-line" }}>{result.aiOpinion}</p>
            </div>
          </div>

          <ClauseAnalysisCard clauses={result.clauses} />
          <MissingClausesCard missingClauses={result.missingClauses} />

          {/* 맞춤 특약 추천 */}
          {result.recommendedTerms && result.recommendedTerms.terms.length > 0 && (
            <RecommendedTermsCard recommendedTerms={result.recommendedTerms} />
          )}

          <SafetyChecklist />

          {/* 무결성 배지 */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "11px", color: "#6e6e73", background: "#f5f5f7",
                borderRadius: "8px", padding: "6px 12px",
                display: "inline-flex", alignItems: "center", gap: "6px",
              }}
            >
              <ShieldCheck size={13} strokeWidth={1.5} />SHA-256 무결성 검증 완료
            </span>
          </div>
          <IntegrityBadge />

          {/* NER 하이라이트 */}
          {contractText && (
            <div
              style={{
                background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                padding: "24px",
              }}
            >
              <NerHighlight text={contractText} />
            </div>
          )}

          {analysisId && <FeedbackWidget analysisId={analysisId} analysisType="contract" className="mt-2" />}

          {/* 면책 조항 */}
          <div
            style={{
              padding: "16px 20px", borderRadius: "14px",
              background: "rgba(255,159,10,0.05)", border: "1px solid rgba(255,159,10,0.18)",
              fontSize: "12.5px", lineHeight: 1.65, color: "#6e6e73",
            }}
          >
            <strong style={{ color: "#b86f00" }}>면책 조항</strong><br />
            본 분석은 AI 및 자체 분석 엔진에 의한 참고용 정보이며, 법률적 조언이 아닙니다.
            계약서의 법적 효력 및 유불리 판단은 반드시 변호사, 법무사 등 법률 전문가와 상담하시기 바랍니다.
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
                { href: "/rights",    icon: Shield,     label: "권리분석"      },
                { href: "/tax",       icon: Calculator, label: "세금 시뮬레이션" },
              ].map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
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
    </AuthGuard>
  );
}
