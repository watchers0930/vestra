"use client";

import { useState, useRef, useCallback } from "react";
import {
  FileSearch,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Shield,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  Database as DatabaseIcon,
  XCircle,
  Info,
  Upload,
  FileText,
  ClipboardPaste,
} from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { addAnalysis } from "@/lib/store";
import { SAMPLE_REGISTRY_TEXT } from "@/lib/registry-parser";
import type { ParsedRegistry } from "@/lib/registry-parser";
import type { RiskScore } from "@/lib/risk-scoring";
import type { ValidationResult } from "@/lib/validation-engine";
import { PageHeader, Card, Button, Alert } from "@/components/common";
import { ScoreGauge, InfoRow } from "@/components/results";
import { SliderInput } from "@/components/forms";

type InputMode = "text" | "file";
type AnalysisStep = "idle" | "extracting" | "parsing" | "validating" | "scoring" | "ai" | "done";

interface AnalysisResult {
  parsed: ParsedRegistry;
  validation: ValidationResult;
  riskScore: RiskScore;
  aiOpinion: string;
}

const GRADE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  B: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  C: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  D: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  F: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const SEVERITY_STYLES = {
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "치명" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "고위험" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "주의" },
  low: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "참고" },
};

const RISK_TYPE_STYLES = {
  danger: { bg: "bg-red-100", text: "text-red-700" },
  warning: { bg: "bg-amber-100", text: "text-amber-700" },
  safe: { bg: "bg-emerald-100", text: "text-emerald-700" },
  info: { bg: "bg-gray-100", text: "text-gray-500" },
};

const VALIDATION_SEVERITY_STYLES = {
  error: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: XCircle, label: "오류" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: AlertTriangle, label: "경고" },
  info: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: Info, label: "정보" },
};

const VALIDATION_CATEGORY_LABELS: Record<string, string> = {
  format: "포맷·타입",
  arithmetic: "합계·산술",
  context: "문맥·규칙",
  crosscheck: "크로스체크",
};

function RegistryStepIndicator({ step, showExtract }: { step: AnalysisStep; showExtract?: boolean }) {
  const baseSteps = [
    { key: "parsing", icon: DatabaseIcon, label: "자체 파싱 엔진", sublabel: "정규식 패턴 매칭" },
    { key: "validating", icon: ShieldCheck, label: "검증 엔진", sublabel: "4단계 데이터 검증" },
    { key: "scoring", icon: Zap, label: "스코어링 알고리즘", sublabel: "가중치 정량 분석" },
    { key: "ai", icon: Brain, label: "AI 종합 의견", sublabel: "GPT-4o 해석" },
  ];

  const steps = showExtract
    ? [{ key: "extracting", icon: FileText, label: "PDF 텍스트 추출", sublabel: "자체 OCR 파싱" }, ...baseSteps]
    : baseSteps;

  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 py-6">
      {steps.map((s, i) => {
        const isActive = s.key === step;
        const isDone = step === "done" || (currentIdx > i);
        return (
          <div key={s.key} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  isDone
                    ? "bg-primary text-white"
                    : isActive
                      ? "bg-primary/20 text-primary animate-pulse"
                      : "bg-gray-100 text-gray-400"
                )}
              >
                {isDone ? (
                  <CheckCircle size={20} />
                ) : isActive ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <s.icon size={20} />
                )}
              </div>
              <div className="text-center">
                <div className={cn("text-[11px] font-medium", isActive || isDone ? "text-primary" : "text-gray-400")}>
                  {s.label}
                </div>
                <div className="text-[9px] text-muted hidden sm:block">{s.sublabel}</div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("w-8 sm:w-12 h-0.5 mb-6", isDone ? "bg-primary" : "bg-gray-200")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function RegistryPage() {
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [rawText, setRawText] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState(850000000);
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGapgu, setShowGapgu] = useState(true);
  const [showEulgu, setShowEulgu] = useState(true);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [pdfInfo, setPdfInfo] = useState<{ pageCount: number; charCount: number; confidence: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSample = () => {
    setRawText(SAMPLE_REGISTRY_TEXT);
    setFileName(null);
    setPdfInfo(null);
    setInputMode("text");
  };

  const handlePdfUpload = useCallback(async (file: File) => {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && file.type !== "application/pdf") {
      setError("PDF 파일만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("파일 크기가 10MB를 초과합니다.");
      return;
    }

    setError(null);
    setFileName(file.name);
    setIsExtracting(true);
    setPdfInfo(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setRawText(data.text);
      setPdfInfo({
        pageCount: data.pageCount,
        charCount: data.charCount,
        confidence: data.confidence,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF 텍스트 추출에 실패했습니다.");
      setFileName(null);
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handlePdfUpload(file);
    },
    [handlePdfUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handlePdfUpload(file);
    },
    [handlePdfUpload]
  );

  const usedPdf = inputMode === "file" && fileName;

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setResult(null);
    setError(null);

    if (usedPdf) {
      setStep("extracting");
      await new Promise((r) => setTimeout(r, 500));
    }

    setStep("parsing");
    await new Promise((r) => setTimeout(r, 800));

    setStep("validating");
    await new Promise((r) => setTimeout(r, 600));

    setStep("scoring");
    await new Promise((r) => setTimeout(r, 500));

    setStep("ai");

    try {
      const res = await fetch("/api/parse-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, estimatedPrice }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
      setAnalyzedAt(new Date());
      setStep("done");

      addAnalysis({
        type: "registry",
        typeLabel: "등기분석",
        address: data.parsed.title.address || (fileName || "직접 입력"),
        summary: `${data.riskScore.grade}등급 (${data.riskScore.gradeLabel}, ${data.riskScore.totalScore}점)`,
        data: data as unknown as Record<string, unknown>,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.");
      setStep("idle");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader icon={FileSearch} title="등기분석" description="PDF 업로드 → 자체 텍스트 추출 → 4단계 검증 + 리스크 스코어링" />
      <div className="flex flex-wrap gap-2 -mt-4 mb-6">
        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">PDF 자체 파싱</span>
        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">4단계 검증 엔진</span>
        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">독자 스코어링 알고리즘</span>
        <span className="px-2 py-0.5 bg-gray-100 text-secondary text-[10px] font-medium rounded">AI 미사용 핵심분석</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 입력 영역 */}
        <div className="space-y-4">
          <Card className="p-5">
            {/* 입력 모드 탭 */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                icon={Upload}
                variant={inputMode === "file" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setInputMode("file")}
              >
                PDF 업로드
              </Button>
              <Button
                icon={ClipboardPaste}
                variant={inputMode === "text" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setInputMode("text")}
              >
                텍스트 입력
              </Button>
              <div className="flex-1" />
              <button
                onClick={loadSample}
                className="px-3 py-1 text-xs text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
              >
                샘플 데이터
              </button>
            </div>

            {/* PDF 업로드 모드 */}
            {inputMode === "file" && (
              <>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex min-h-[250px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-colors",
                    isExtracting
                      ? "border-primary bg-primary/5 pointer-events-none"
                      : isDragging
                        ? "border-primary bg-primary/5"
                        : fileName && rawText
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                  )}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 size={40} className="text-primary animate-spin" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-primary">PDF 텍스트 추출 중...</p>
                        <p className="mt-1 text-xs text-secondary">{fileName}</p>
                      </div>
                    </>
                  ) : fileName && rawText ? (
                    <>
                      <FileText size={40} className="text-emerald-600" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-emerald-700">{fileName}</p>
                        {pdfInfo && (
                          <div className="flex items-center gap-3 mt-1.5 justify-center">
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                              {pdfInfo.pageCount}페이지
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                              {pdfInfo.charCount.toLocaleString()}자 추출
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                              신뢰도 {pdfInfo.confidence}%
                            </span>
                          </div>
                        )}
                        <p className="mt-2 text-[10px] text-secondary">다른 파일을 업로드하려면 클릭하세요</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload
                        size={40}
                        className={cn("transition-colors", isDragging ? "text-primary" : "text-gray-400")}
                      />
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">등기부등본 PDF를 드래그하거나 클릭하여 업로드</p>
                        <p className="mt-1 text-xs text-gray-400">인터넷등기소(iros.go.kr) PDF 지원 · 최대 10MB</p>
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {rawText && (
                  <div className="mt-2 text-right text-[10px] text-muted">
                    {rawText.length.toLocaleString()}자 추출됨
                  </div>
                )}
              </>
            )}

            {/* 텍스트 입력 모드 */}
            {inputMode === "text" && (
              <>
                <textarea
                  value={rawText}
                  onChange={(e) => { setRawText(e.target.value); setFileName(null); setPdfInfo(null); }}
                  placeholder={"등기부등본 텍스트를 붙여넣으세요...\n\n【 표 제 부 】 (건물의 표시)\n...\n【 갑 구 】 (소유권에 관한 사항)\n...\n【 을 구 】 (소유권 이외의 권리에 관한 사항)\n..."}
                  className="w-full h-64 px-3 py-2 rounded-lg border border-border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                  disabled={step !== "idle" && step !== "done"}
                />
                <div className="text-right text-[10px] text-muted mt-1">
                  {rawText.length.toLocaleString()}자 입력됨
                </div>
              </>
            )}
          </Card>

          <Card className="p-5">
            <SliderInput
              label="추정 시세 (선택)"
              value={estimatedPrice}
              onChange={setEstimatedPrice}
              min={50000000}
              max={3000000000}
              step={10000000}
            />
            <p className="text-[10px] text-muted mt-1">
              시세를 입력하면 근저당 비율 기반 리스크를 더 정확히 산출합니다
            </p>
          </Card>

          <Button
            icon={step !== "idle" && step !== "done" ? undefined : Shield}
            loading={step !== "idle" && step !== "done"}
            disabled={!rawText.trim() || isExtracting}
            fullWidth
            size="lg"
            onClick={handleAnalyze}
          >
            {usedPdf ? "PDF 등기부등본 분석 실행" : "등기부등본 분석 실행"}
          </Button>
        </div>

        {/* 결과 영역 */}
        <div className="space-y-4">
          {/* 분석 단계 표시 */}
          {step !== "idle" && step !== "done" && (
            <Card className="p-4">
              <RegistryStepIndicator step={step} showExtract={!!usedPdf} />
            </Card>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          {result && (
            <>
              {/* 리스크 스코어 */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <Shield size={18} className="text-primary" />
                    리스크 스코어
                  </h4>
                  {analyzedAt && (
                    <span className="text-[11px] text-muted">
                      {analyzedAt.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}{" "}
                      {analyzedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ScoreGauge
                    score={result.riskScore.totalScore}
                    grade={`${result.riskScore.grade}등급`}
                    label={result.riskScore.gradeLabel}
                  />
                  <div className="flex-1 space-y-2 w-full">
                    <InfoRow label="감점 합계" value={<span className="text-red-600">-{result.riskScore.totalDeduction}점</span>} />
                    {result.riskScore.mortgageRatio > 0 && (
                      <InfoRow label="근저당 비율" value={`${result.riskScore.mortgageRatio.toFixed(1)}%`} />
                    )}
                    <InfoRow label="현행 갑구" value={`${result.parsed.summary.activeGapguEntries}건`} />
                    <InfoRow label="현행 을구" value={`${result.parsed.summary.activeEulguEntries}건`} />
                    {result.parsed.summary.totalMortgageAmount > 0 && (
                      <InfoRow label="근저당 총액" value={formatKRW(result.parsed.summary.totalMortgageAmount)} />
                    )}
                  </div>
                </div>
              </Card>

              {/* 검증 결과 */}
              {result.validation && (
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold flex items-center gap-2 text-sm">
                      <ShieldCheck size={18} className="text-primary" />
                      데이터 검증 결과
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        result.validation.isValid
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      )}>
                        {result.validation.isValid ? "검증 통과" : "검증 이슈 발견"}
                      </span>
                      <span className="text-xs font-semibold text-primary">
                        {result.validation.score}점
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-sm font-bold text-primary">{result.validation.summary.totalChecks}</div>
                      <div className="text-[9px] text-muted">총 검사</div>
                    </div>
                    <div className="text-center p-2 bg-emerald-50 rounded-lg">
                      <div className="text-sm font-bold text-emerald-600">{result.validation.summary.passed}</div>
                      <div className="text-[9px] text-muted">통과</div>
                    </div>
                    <div className="text-center p-2 bg-amber-50 rounded-lg">
                      <div className="text-sm font-bold text-amber-600">{result.validation.summary.warnings}</div>
                      <div className="text-[9px] text-muted">경고</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <div className="text-sm font-bold text-red-600">{result.validation.summary.errors}</div>
                      <div className="text-[9px] text-muted">오류</div>
                    </div>
                  </div>

                  {result.validation.issues.length > 0 && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {result.validation.issues
                        .sort((a, b) => {
                          const order = { error: 0, warning: 1, info: 2 };
                          return order[a.severity] - order[b.severity];
                        })
                        .map((issue, idx) => {
                          const style = VALIDATION_SEVERITY_STYLES[issue.severity];
                          const Icon = style.icon;
                          return (
                            <div key={idx} className={cn("flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-xs", style.bg)}>
                              <Icon size={13} className={cn("flex-shrink-0 mt-0.5", style.text)} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("font-medium", style.text)}>{style.label}</span>
                                  <span className="text-[9px] px-1 py-0.5 bg-white/50 rounded text-secondary">
                                    {VALIDATION_CATEGORY_LABELS[issue.category] || issue.category}
                                  </span>
                                </div>
                                <p className="text-secondary leading-snug mt-0.5 break-words">{issue.message}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {result.validation.issues.length === 0 && (
                    <div className="text-center py-3 text-emerald-600 text-xs">
                      <CheckCircle size={16} className="inline mr-1" />
                      모든 검증 항목을 통과했습니다.
                    </div>
                  )}
                </Card>
              )}

              {/* 리스크 요인 */}
              {result.riskScore.factors.length > 0 && (
                <Card className="p-5">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <AlertTriangle size={18} className="text-amber-500" />
                    감점 요인 ({result.riskScore.factors.length}건)
                  </h4>
                  <div className="space-y-2">
                    {result.riskScore.factors.map((factor) => {
                      const sev = SEVERITY_STYLES[factor.severity];
                      return (
                        <div key={factor.id} className={cn("rounded-lg border p-3", sev.border, sev.bg)}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", sev.bg, sev.text)}>
                                {sev.label}
                              </span>
                              <span className={cn("text-sm font-medium", sev.text)}>{factor.description}</span>
                            </div>
                            <span className="text-sm font-bold text-red-600">-{factor.deduction}</span>
                          </div>
                          <p className="text-xs text-secondary leading-relaxed">{factor.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* 표제부 */}
              {result.parsed.title.address && (
                <Card className="p-5">
                  <h4 className="font-semibold mb-3 text-sm">표제부 (건물의 표시)</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {result.parsed.title.address && (
                      <div className="col-span-2">
                        <span className="text-secondary text-xs">소재지</span>
                        <div className="font-medium">{result.parsed.title.address}</div>
                      </div>
                    )}
                    {result.parsed.title.area && (
                      <div>
                        <span className="text-secondary text-xs">면적</span>
                        <div className="font-medium">{result.parsed.title.area}</div>
                      </div>
                    )}
                    {result.parsed.title.structure && (
                      <div>
                        <span className="text-secondary text-xs">구조</span>
                        <div className="font-medium">{result.parsed.title.structure}</div>
                      </div>
                    )}
                    {result.parsed.title.purpose && (
                      <div>
                        <span className="text-secondary text-xs">용도</span>
                        <div className="font-medium">{result.parsed.title.purpose}</div>
                      </div>
                    )}
                    {result.parsed.title.landRightRatio && (
                      <div>
                        <span className="text-secondary text-xs">대지권 비율</span>
                        <div className="font-medium">{result.parsed.title.landRightRatio}</div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* 갑구 */}
              {result.parsed.gapgu.length > 0 && (
                <Card className="p-5">
                  <button
                    onClick={() => setShowGapgu(!showGapgu)}
                    className="w-full flex items-center justify-between"
                  >
                    <h4 className="font-semibold text-sm">갑구 (소유권) — {result.parsed.gapgu.length}건</h4>
                    {showGapgu ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {showGapgu && (
                    <div className="mt-3 space-y-2">
                      {result.parsed.gapgu.map((entry, i) => {
                        const riskStyle = RISK_TYPE_STYLES[entry.riskType];
                        return (
                          <div
                            key={i}
                            className={cn(
                              "rounded-lg border p-3 text-xs",
                              entry.isCancelled ? "opacity-50 bg-gray-50 border-gray-200" : "bg-white border-border"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-secondary">#{entry.order}</span>
                              <span className={cn("px-1.5 py-0.5 rounded font-medium", riskStyle.bg, riskStyle.text)}>
                                {entry.purpose}
                              </span>
                              {entry.isCancelled && (
                                <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 text-[10px]">말소</span>
                              )}
                              {entry.date && <span className="text-muted ml-auto">{entry.date}</span>}
                            </div>
                            {entry.holder && <div className="text-secondary">{entry.holder}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}

              {/* 을구 */}
              {result.parsed.eulgu.length > 0 && (
                <Card className="p-5">
                  <button
                    onClick={() => setShowEulgu(!showEulgu)}
                    className="w-full flex items-center justify-between"
                  >
                    <h4 className="font-semibold text-sm">을구 (권리관계) — {result.parsed.eulgu.length}건</h4>
                    {showEulgu ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {showEulgu && (
                    <div className="mt-3 space-y-2">
                      {result.parsed.eulgu.map((entry, i) => {
                        const riskStyle = RISK_TYPE_STYLES[entry.riskType];
                        return (
                          <div
                            key={i}
                            className={cn(
                              "rounded-lg border p-3 text-xs",
                              entry.isCancelled ? "opacity-50 bg-gray-50 border-gray-200" : "bg-white border-border"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-secondary">#{entry.order}</span>
                              <span className={cn("px-1.5 py-0.5 rounded font-medium", riskStyle.bg, riskStyle.text)}>
                                {entry.purpose}
                              </span>
                              {entry.isCancelled && (
                                <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 text-[10px]">말소</span>
                              )}
                              {entry.date && <span className="text-muted ml-auto">{entry.date}</span>}
                            </div>
                            <div className="flex items-center justify-between">
                              {entry.holder && <span className="text-secondary">{entry.holder}</span>}
                              {entry.amount > 0 && (
                                <span className="font-semibold text-primary">{formatKRW(entry.amount)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}

              {/* AI 종합 의견 */}
              {result.aiOpinion && (
                <Alert variant="info">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                    <Brain size={18} />
                    AI 종합 의견
                  </h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.aiOpinion}</p>
                </Alert>
              )}

              {/* 파싱 통계 */}
              <div className="bg-gray-50 border border-border rounded-xl p-4">
                <h4 className="font-semibold text-xs text-secondary mb-2">파싱 엔진 통계</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-primary">{result.parsed.summary.totalGapguEntries}</div>
                    <div className="text-[10px] text-muted">갑구 총 항목</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-primary">{result.parsed.summary.totalEulguEntries}</div>
                    <div className="text-[10px] text-muted">을구 총 항목</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-600">{result.parsed.summary.cancelledEntries}</div>
                    <div className="text-[10px] text-muted">말소 항목</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">{result.riskScore.factors.length}</div>
                    <div className="text-[10px] text-muted">리스크 요인</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 초기 상태 */}
          {step === "idle" && !result && (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileSearch size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">등기부등본 분석</h3>
              <p className="text-secondary text-sm mb-4 max-w-sm mx-auto">
                등기부등본 PDF를 업로드하면 자체 텍스트 추출 엔진과
                리스크 스코어링 알고리즘으로 즉시 분석합니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center text-xs text-muted">
                <span className="flex items-center gap-1"><Upload size={12} /> PDF 자체 추출</span>
                <span className="flex items-center gap-1"><DatabaseIcon size={12} /> 자체 파싱 엔진</span>
                <span className="flex items-center gap-1"><ShieldCheck size={12} /> 4단계 검증</span>
                <span className="flex items-center gap-1"><Zap size={12} /> 독자 스코어링</span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
