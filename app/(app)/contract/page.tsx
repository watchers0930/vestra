"use client";

import Link from "next/link";
import { FileSearch, Shield, Calculator, Copy, ShieldCheck, ClipboardCheck } from "lucide-react";
import { Card, Alert } from "@/components/common";
import FeedbackWidget from "@/components/common/FeedbackWidget";
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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f5f7] text-[#1d1d1f]">
            <FileSearch size={22} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1d1d1f]">계약검토</h1>
            <p className="text-sm text-[#6e6e73]">AI 기반 부동산 계약서 자동 분석</p>
          </div>
        </div>
      </div>

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

      {result && (
        <div ref={resultRef} className="space-y-6" aria-live="polite">
          {/* 결과 상단 액션 */}
          <div className="flex items-center justify-between">
            <AiDisclaimer compact />
            <div className="flex items-center gap-2">
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
                    result.missingClauses.forEach((mc) => {
                      lines.push(`- ${mc.title}: ${mc.description}`);
                    });
                  }
                  await navigator.clipboard.writeText(lines.join("\n"));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5e7] bg-white text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all"
              >
                {copied ? <ClipboardCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? "복사됨" : "결과 복사"}
              </button>
              <PdfDownloadButton targetRef={resultRef} filename="vestra-contract-review.pdf" title="VESTRA 계약검토 리포트" />
            </div>
          </div>

          {/* Safety Score + AI Opinion */}
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <Card className="flex flex-col items-center justify-center p-6">
              <h2 className="mb-4 text-sm font-semibold text-[#6e6e73]">계약 안전점수</h2>
              <ScoreGauge score={result.safetyScore} grade={getScoreLabel(result.safetyScore)} />
            </Card>
            <Card className="p-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#6e6e73]">
                <FileSearch size={16} strokeWidth={1.5} className="text-[#1d1d1f]" />
                AI 종합 의견
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[#1d1d1f]">{result.aiOpinion}</p>
            </Card>
          </div>

          <ClauseAnalysisCard clauses={result.clauses} />
          <MissingClausesCard missingClauses={result.missingClauses} />
          <SafetyChecklist />

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#6e6e73] bg-[#f5f5f7] rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
              <ShieldCheck size={13} strokeWidth={1.5} className="text-[#6e6e73]" />
              SHA-256 무결성 검증 완료
            </span>
          </div>
          <IntegrityBadge />

          {contractText && (
            <Card className="p-6">
              <NerHighlight text={contractText} />
            </Card>
          )}

          {analysisId && <FeedbackWidget analysisId={analysisId} analysisType="contract" className="mt-4" />}

          <Alert variant="warning">
            <strong>면책 조항</strong><br />
            본 분석은 AI 및 자체 분석 엔진에 의한 참고용 정보이며, 법률적 조언이 아닙니다.
            계약서의 법적 효력 및 유불리 판단은 반드시 변호사, 법무사 등 법률 전문가와 상담하시기 바랍니다.
            VESTRA는 본 분석 결과에 따른 계약 체결 및 손해에 대해 책임을 지지 않습니다.
          </Alert>

          <div className="mt-6 p-4 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7]">
            <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider mb-3">이 물건으로 추가 분석</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/rights" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e5e7] bg-white text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all">
                <Shield size={16} strokeWidth={1.5} />이 물건의 권리분석
              </Link>
              <Link href="/tax" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e5e7] bg-white text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all">
                <Calculator size={16} strokeWidth={1.5} />세금 시뮬레이션
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
