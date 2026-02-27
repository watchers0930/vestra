"use client";

import { useState, useRef, useCallback } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Upload,
  FileText,
  ClipboardPaste,
  ImageIcon,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  ShieldCheck,
  Database as DatabaseIcon,
} from "lucide-react";
import { formatKRW, cn } from "@/lib/utils";
import { addAnalysis, addOrUpdateAsset } from "@/lib/store";
import { SAMPLE_REGISTRY_TEXT } from "@/lib/registry-parser";
import type { ParsedRegistry } from "@/lib/registry-parser";
import type { RiskScore, RiskFactor } from "@/lib/risk-scoring";
import type { ValidationResult } from "@/lib/validation-engine";
import { PageHeader, Card, Alert } from "@/components/common";
import { ScoreGauge } from "@/components/results";
import { SliderInput } from "@/components/forms";

// ─── 타입 ───

interface RiskItem {
  level: "danger" | "warning" | "safe";
  title: string;
  description: string;
}

interface UnifiedResult {
  propertyInfo: {
    address: string;
    type: string;
    area: string;
    buildYear: string;
    estimatedPrice: number;
    jeonsePrice: number;
    recentTransaction: string;
  };
  riskAnalysis: {
    jeonseRatio: number;
    mortgageRatio: number;
    safetyScore: number;
    riskScore: number;
    risks: RiskItem[];
  };
  parsed: ParsedRegistry;
  validation: ValidationResult;
  riskScore: RiskScore;
  marketData: {
    sale: { avgPrice: number; transactionCount: number } | null;
    rent: { avgDeposit: number; jeonseCount: number } | null;
    jeonseRatio: number | null;
  } | null;
  aiOpinion: string;
  dataSource: {
    registryParsed: boolean;
    molitAvailable: boolean;
    estimatedPriceSource: string;
  };
}

type InputMode = "file" | "text";
type AnalysisStep = "idle" | "extracting" | "parsing" | "validating" | "scoring" | "molit" | "ai" | "done";

// ─── 스타일 상수 ───

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "치명" },
  high: { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", label: "고위험" },
  medium: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "주의" },
  low: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "참고" },
};

const RISK_CONFIG = {
  danger: { bg: "bg-red-50 border-red-200", text: "text-red-700", descText: "text-red-600", icon: XCircle, iconColor: "text-red-500" },
  warning: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", descText: "text-amber-600", icon: AlertTriangle, iconColor: "text-amber-500" },
  safe: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", descText: "text-emerald-600", icon: CheckCircle, iconColor: "text-emerald-500" },
};

// ─── 스텝 인디케이터 ───

function AnalysisStepIndicator({ step, showExtract, fileType }: { step: AnalysisStep; showExtract?: boolean; fileType?: "pdf" | "image" | null }) {
  const baseSteps = [
    { key: "parsing", icon: DatabaseIcon, label: "파싱 엔진" },
    { key: "validating", icon: ShieldCheck, label: "검증 엔진" },
    { key: "scoring", icon: Zap, label: "스코어링" },
    { key: "molit", icon: DatabaseIcon, label: "실거래 조회" },
    { key: "ai", icon: Brain, label: "AI 종합" },
  ];

  const extractStep = fileType === "image"
    ? { key: "extracting", icon: ImageIcon, label: "이미지 OCR" }
    : { key: "extracting", icon: FileText, label: "PDF 추출" };

  const steps = showExtract ? [extractStep, ...baseSteps] : baseSteps;
  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 py-4">
      {steps.map((s, i) => {
        const isActive = s.key === step;
        const isDone = step === "done" || currentIdx > i;
        return (
          <div key={s.key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                isDone ? "bg-primary text-white" : isActive ? "bg-primary/20 text-primary animate-pulse" : "bg-gray-100 text-gray-400"
              )}>
                {isDone ? <CheckCircle size={18} /> : isActive ? <Loader2 size={18} className="animate-spin" /> : <s.icon size={18} />}
              </div>
              <div className={cn("text-[10px] font-medium", isActive || isDone ? "text-primary" : "text-gray-400")}>{s.label}</div>
            </div>
            {i < steps.length - 1 && <div className={cn("w-6 sm:w-10 h-0.5 mb-5", isDone ? "bg-primary" : "bg-gray-200")} />}
          </div>
        );
      })}
    </div>
  );
}

function getScoreLabel(score: number) {
  if (score >= 70) return "안전";
  if (score >= 40) return "주의";
  return "위험";
}

// ─── 메인 컴포넌트 ───

export default function RightsAnalysisPage() {
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [rawText, setRawText] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState(850000000);
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [result, setResult] = useState<UnifiedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"pdf" | "image" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 접기 상태
  const [showGapgu, setShowGapgu] = useState(false);
  const [showEulgu, setShowEulgu] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const loadSample = () => {
    setRawText(SAMPLE_REGISTRY_TEXT);
    setFileName(null);
    setFileType(null);
    setInputMode("text");
  };

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const firstFile = files[0];
    const ext = firstFile.name.split(".").pop()?.toLowerCase();
    const isPdf = ext === "pdf" || firstFile.type === "application/pdf";
    const isImage = ["jpg", "jpeg", "png"].includes(ext || "") || firstFile.type.startsWith("image/");

    if (!isPdf && !isImage) {
      setError("PDF, JPG, PNG 파일만 업로드할 수 있습니다.");
      return;
    }

    const uploadFiles = isPdf ? [firstFile] : files.slice(0, 5);
    for (const file of uploadFiles) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`파일 크기가 10MB를 초과합니다: ${file.name}`);
        return;
      }
    }

    setError(null);
    setFileType(isPdf ? "pdf" : "image");
    setFileName(isPdf ? firstFile.name : `${uploadFiles.length}개 이미지`);
    setIsExtracting(true);

    try {
      const formData = new FormData();
      for (const file of uploadFiles) formData.append("file", file);
      const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRawText(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "텍스트 추출에 실패했습니다.");
      setFileName(null);
      setFileType(null);
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) handleFileUpload(files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) handleFileUpload(files);
    if (e.target) e.target.value = "";
  }, [handleFileUpload]);

  const usedFile = inputMode === "file" && fileName;

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setResult(null);
    setError(null);

    if (usedFile) { setStep("extracting"); await new Promise((r) => setTimeout(r, 400)); }
    setStep("parsing"); await new Promise((r) => setTimeout(r, 600));
    setStep("validating"); await new Promise((r) => setTimeout(r, 400));
    setStep("scoring"); await new Promise((r) => setTimeout(r, 400));
    setStep("molit"); await new Promise((r) => setTimeout(r, 300));
    setStep("ai");

    try {
      const res = await fetch("/api/analyze-unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, estimatedPrice }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
      setStep("done");

      addAnalysis({
        type: "rights",
        typeLabel: "권리분석",
        address: data.parsed?.title?.address || (fileName || "직접 입력"),
        summary: `${data.riskScore?.grade || "?"}등급 (${data.riskScore?.gradeLabel || ""}, ${data.riskScore?.totalScore || 0}점) | 근저당비율 ${data.riskScore?.mortgageRatio?.toFixed(1) || 0}%`,
        data: data as unknown as Record<string, unknown>,
      });
      addOrUpdateAsset({
        address: data.propertyInfo?.address || "직접 입력",
        type: data.propertyInfo?.type || "부동산",
        estimatedPrice: data.propertyInfo?.estimatedPrice || 0,
        jeonsePrice: data.propertyInfo?.jeonsePrice || 0,
        safetyScore: data.riskAnalysis?.safetyScore || 0,
        riskScore: data.riskAnalysis?.riskScore || 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.");
      setStep("idle");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader icon={Shield} title="권리분석" description="등기부등본 업로드 → 실제 데이터 기반 종합 권리분석" />

      {/* 입력 섹션 */}
      <Card className="p-6 mb-6">
        {/* 입력 모드 토글 */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setInputMode("file")} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all", inputMode === "file" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-secondary border-border hover:bg-gray-50")}>
            <Upload size={14} /> 파일 업로드
          </button>
          <button onClick={() => setInputMode("text")} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all", inputMode === "text" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-secondary border-border hover:bg-gray-50")}>
            <ClipboardPaste size={14} /> 텍스트 입력
          </button>
          <button onClick={loadSample} className="px-3 py-1.5 text-xs rounded-lg border border-border text-secondary hover:bg-gray-50 transition-all">
            샘플 데이터
          </button>
        </div>

        {/* 파일 업로드 */}
        {inputMode === "file" && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
              isDragging ? "border-primary bg-primary/5" : fileName ? "border-emerald-300 bg-emerald-50" : "border-border hover:border-primary/50 hover:bg-gray-50"
            )}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileChange} className="hidden" />
            {isExtracting ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={32} className="animate-spin text-primary" />
                <p className="text-sm text-primary font-medium">텍스트 추출 중...</p>
              </div>
            ) : fileName ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle size={32} className="text-emerald-500" />
                <p className="text-sm font-medium text-emerald-700">{fileName}</p>
                <p className="text-xs text-emerald-600">텍스트 추출 완료 ({rawText.length.toLocaleString()}자) — 클릭하여 변경</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={32} className="text-gray-400" />
                <p className="text-sm text-gray-600">등기부등본 PDF 또는 이미지를 드래그하세요</p>
                <p className="text-xs text-gray-400">PDF, JPG, PNG (최대 10MB)</p>
              </div>
            )}
          </div>
        )}

        {/* 텍스트 입력 */}
        {inputMode === "text" && (
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="등기부등본 텍스트를 붙여넣으세요..."
            className="w-full h-48 px-4 py-3 rounded-lg border border-border text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        )}

        {/* 추정 시세 슬라이더 */}
        {rawText && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <SliderInput
              label="추정 시세 (선택사항)"
              value={estimatedPrice}
              onChange={setEstimatedPrice}
              min={50000000}
              max={5000000000}
              step={10000000}
              formatValue={formatKRW}
            />
            <p className="text-[10px] text-gray-400 mt-1">MOLIT 실거래 데이터가 있으면 자동으로 시세를 반영합니다</p>
          </div>
        )}

        {/* 분석 버튼 */}
        <button
          onClick={handleAnalyze}
          disabled={!rawText.trim() || (step !== "idle" && step !== "done")}
          className="mt-4 w-full py-3 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <Shield size={16} />
          종합 권리분석 시작
        </button>
      </Card>

      {/* 에러 */}
      {error && <div className="mb-6"><Alert variant="error">{error}</Alert></div>}

      {/* 분석 진행 중 */}
      {step !== "idle" && step !== "done" && !error && (
        <Card className="p-6 mb-6">
          <p className="text-sm font-medium text-gray-700 text-center mb-2">등기부등본 종합 분석 중...</p>
          <AnalysisStepIndicator step={step} showExtract={!!usedFile} fileType={fileType} />
        </Card>
      )}

      {/* 결과 */}
      {result && step === "done" && (
        <div className="space-y-6">
          {/* 안전도 점수 + 핵심 지표 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-6 flex flex-col items-center justify-center">
              <h3 className="text-sm font-medium text-gray-500 mb-4">안전도 점수</h3>
              <ScoreGauge
                score={result.riskAnalysis.safetyScore}
                size="lg"
                grade={getScoreLabel(result.riskAnalysis.safetyScore)}
                showLabel={false}
              />
              <div className="mt-4 grid grid-cols-2 gap-4 w-full text-center">
                <div>
                  <p className="text-xs text-gray-400">근저당비율</p>
                  <p className="text-lg font-bold text-gray-900">{result.riskAnalysis.mortgageRatio.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">전세가율</p>
                  <p className="text-lg font-bold text-gray-900">{result.riskAnalysis.jeonseRatio}%</p>
                </div>
              </div>
              {/* 데이터 소스 표시 */}
              <div className="mt-3 flex gap-1.5">
                <span className="px-2 py-0.5 text-[9px] rounded-full bg-emerald-100 text-emerald-700">등기부등본 실제 데이터</span>
                {result.dataSource?.molitAvailable && (
                  <span className="px-2 py-0.5 text-[9px] rounded-full bg-blue-100 text-blue-700">MOLIT 실거래</span>
                )}
              </div>
            </Card>

            {/* 위험 분석 항목 */}
            <Card className="lg:col-span-2 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">위험 분석 항목 ({result.riskAnalysis.risks.length}건)</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {result.riskAnalysis.risks.length > 0 ? result.riskAnalysis.risks.map((risk, i) => {
                  const c = RISK_CONFIG[risk.level];
                  const Icon = c.icon;
                  return (
                    <div key={i} className={cn("flex items-start gap-3 rounded-lg border p-3", c.bg)}>
                      <Icon size={16} className={cn("mt-0.5 flex-shrink-0", c.iconColor)} />
                      <div>
                        <p className={cn("text-sm font-medium", c.text)}>{risk.title}</p>
                        <p className={cn("text-xs mt-0.5", c.descText)}>{risk.description}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <p className="text-sm text-emerald-700">특별한 위험 요소가 발견되지 않았습니다</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* 부동산 기본정보 */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-blue-600" />
              부동산 기본정보
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><p className="text-xs text-gray-400 mb-1">주소</p><p className="text-sm font-medium text-gray-900">{result.propertyInfo.address || "-"}</p></div>
              <div><p className="text-xs text-gray-400 mb-1">건물유형</p><p className="text-sm font-medium text-gray-900">{result.propertyInfo.type || "-"}</p></div>
              <div><p className="text-xs text-gray-400 mb-1">전용면적</p><p className="text-sm font-medium text-gray-900">{result.propertyInfo.area || "-"}</p></div>
              <div><p className="text-xs text-gray-400 mb-1">추정 시세</p><p className="text-sm font-bold text-blue-600">{result.propertyInfo.estimatedPrice ? formatKRW(result.propertyInfo.estimatedPrice) : "-"}</p></div>
              <div><p className="text-xs text-gray-400 mb-1">전세 시세</p><p className="text-sm font-bold text-emerald-600">{result.propertyInfo.jeonsePrice ? formatKRW(result.propertyInfo.jeonsePrice) : "-"}</p></div>
              {result.propertyInfo.recentTransaction && (
                <div><p className="text-xs text-gray-400 mb-1">최근 거래</p><p className="text-sm font-medium text-gray-900">{result.propertyInfo.recentTransaction}</p></div>
              )}
            </div>
          </Card>

          {/* 등기부 상세 (접기) - 갑구 */}
          {result.parsed?.gapgu?.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <button onClick={() => setShowGapgu(!showGapgu)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  갑구 (소유권) <span className="text-xs font-normal text-gray-400">{result.parsed.gapgu.length}건</span>
                </h3>
                {showGapgu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showGapgu && (
                <div className="px-4 pb-4 space-y-2">
                  {result.parsed.gapgu.map((entry, i) => (
                    <div key={i} className={cn("p-3 rounded-lg border text-xs", entry.isCancelled ? "opacity-50 bg-gray-50 border-gray-200 line-through" : "bg-white border-border")}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-gray-400">#{entry.order}</span>
                        <span className="font-medium">{entry.purpose}</span>
                        <span className="text-gray-400">{entry.date}</span>
                        {entry.isCancelled && <span className="text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">말소</span>}
                      </div>
                      <p className="text-gray-600">{entry.holder}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* 등기부 상세 (접기) - 을구 */}
          {result.parsed?.eulgu?.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <button onClick={() => setShowEulgu(!showEulgu)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  을구 (근저당/전세권) <span className="text-xs font-normal text-gray-400">{result.parsed.eulgu.length}건</span>
                </h3>
                {showEulgu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showEulgu && (
                <div className="px-4 pb-4 space-y-2">
                  {result.parsed.eulgu.map((entry, i) => (
                    <div key={i} className={cn("p-3 rounded-lg border text-xs", entry.isCancelled ? "opacity-50 bg-gray-50 border-gray-200 line-through" : "bg-white border-border")}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-gray-400">#{entry.order}</span>
                        <span className="font-medium">{entry.purpose}</span>
                        <span className="text-gray-400">{entry.date}</span>
                        {entry.amount > 0 && <span className="text-blue-600 font-medium">{formatKRW(entry.amount)}</span>}
                        {entry.isCancelled && <span className="text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">말소</span>}
                      </div>
                      <p className="text-gray-600">{entry.holder}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* 검증 결과 (접기) */}
          {result.validation?.issues?.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <button onClick={() => setShowValidation(!showValidation)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  검증 결과
                  <span className="text-xs font-normal text-gray-400">
                    {result.validation.issues.filter((i) => i.severity === "error").length}오류 /
                    {result.validation.issues.filter((i) => i.severity === "warning").length}경고
                  </span>
                </h3>
                {showValidation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showValidation && (
                <div className="px-4 pb-4 space-y-2">
                  {result.validation.issues.map((issue, i) => (
                    <div key={i} className={cn("p-3 rounded-lg border text-xs", SEVERITY_STYLES[issue.severity]?.bg || "bg-gray-50")}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium", SEVERITY_STYLES[issue.severity]?.text || "")}>{SEVERITY_STYLES[issue.severity]?.label || issue.severity}</span>
                        <span className="font-medium">{issue.field}</span>
                      </div>
                      <p className={cn(SEVERITY_STYLES[issue.severity]?.text || "text-gray-600")}>{issue.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* AI 종합 의견 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI 종합 의견</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{result.aiOpinion}</p>
          </div>

          {/* 면책 조항 */}
          <Alert variant="warning">
            <strong>면책 조항</strong><br />
            본 분석은 등기부등본 자체 파싱 엔진 + AI 기반의 참고 자료이며, 법적 조언이 아닙니다.
            등기부등본의 정확성은 원본 문서와 대조해 확인하시기 바랍니다.
            부동산 거래 결정 시 반드시 법무사, 공인중개사 등 전문가와 상담하세요.
          </Alert>
        </div>
      )}
    </div>
  );
}
