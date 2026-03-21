"use client";

import { useState, useRef, useCallback } from "react";
import {
  Shield,
  CheckCircle,
  Upload,
  FileText,
  ClipboardPaste,
  ImageIcon,
  Loader2,
  Zap,
  Brain,
  ShieldCheck,
  Database as DatabaseIcon,
} from "lucide-react";
import { formatKRW, cn } from "@/lib/utils";
import { addAnalysis, addOrUpdateAsset } from "@/lib/store";
import { SAMPLE_REGISTRY_TEXT } from "@/lib/registry-parser";
import { PageHeader, Card, Alert } from "@/components/common";
import { SliderInput } from "@/components/forms";
import { RightsResult, type UnifiedResult } from "@/components/rights/RightsResult";

// ─── 타입 ───

type InputMode = "file" | "text";
type AnalysisStep = "idle" | "extracting" | "parsing" | "validating" | "scoring" | "molit" | "ai" | "done";

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
                isDone ? "bg-primary text-white" : isActive ? "bg-primary/20 text-primary animate-pulse" : "bg-[#e5e5e7] text-[#6e6e73]"
              )}>
                {isDone ? <CheckCircle size={18} /> : isActive ? <Loader2 size={18} className="animate-spin" /> : <s.icon size={18} />}
              </div>
              <div className={cn("text-[10px] font-medium", isActive || isDone ? "text-primary" : "text-[#6e6e73]")}>{s.label}</div>
            </div>
            {i < steps.length - 1 && <div className={cn("w-6 sm:w-10 h-0.5 mb-5", isDone ? "bg-primary" : "bg-[#e5e5e7]")} />}
          </div>
        );
      })}
    </div>
  );
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

  const abortRef = useRef<AbortController | null>(null);

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

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
        signal: controller.signal,
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
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.");
      setStep("idle");
    }
  };

  return (
    <div>
      <PageHeader icon={Shield} title="권리분석" description="등기부등본 업로드 → 실제 데이터 기반 종합 권리분석" />

      {/* 입력 섹션 */}
      <Card className="p-6 mb-6">
        {/* 입력 모드 토글 */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setInputMode("file")} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all", inputMode === "file" ? "bg-[#1d1d1f] text-white border-[#1d1d1f]" : "bg-white text-secondary border-border hover:bg-[#f5f5f7]")}>
            <Upload size={14} /> 파일 업로드
          </button>
          <button onClick={() => setInputMode("text")} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all", inputMode === "text" ? "bg-[#1d1d1f] text-white border-[#1d1d1f]" : "bg-white text-secondary border-border hover:bg-[#f5f5f7]")}>
            <ClipboardPaste size={14} /> 텍스트 입력
          </button>
          <button onClick={loadSample} className="px-3 py-1.5 text-xs rounded-lg border border-border text-secondary hover:bg-[#f5f5f7] transition-all">
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
              isDragging ? "border-primary bg-primary/5" : fileName ? "border-emerald-300 bg-emerald-50" : "border-border hover:border-primary/50 hover:bg-[#f5f5f7]"
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
                <Upload size={32} className="text-[#6e6e73]" />
                <p className="text-sm text-[#6e6e73]">등기부등본 PDF 또는 이미지를 드래그하세요</p>
                <p className="text-xs text-[#6e6e73]">PDF, JPG, PNG (최대 10MB)</p>
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
          <div className="mt-4 p-3 bg-[#f5f5f7] rounded-lg">
            <SliderInput
              label="추정 시세 (선택사항)"
              value={estimatedPrice}
              onChange={setEstimatedPrice}
              min={50000000}
              max={5000000000}
              step={10000000}
              formatValue={formatKRW}
            />
            <p className="text-[10px] text-[#6e6e73] mt-1">MOLIT 실거래 데이터가 있으면 자동으로 시세를 반영합니다</p>
          </div>
        )}

        {/* 분석 버튼 */}
        <button
          onClick={handleAnalyze}
          disabled={!rawText.trim() || (step !== "idle" && step !== "done")}
          className="mt-4 w-full py-3 rounded-lg bg-[#1d1d1f] text-white text-sm font-medium hover:bg-[#1d1d1f]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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
          <p className="text-sm font-medium text-[#1d1d1f] text-center mb-2">등기부등본 종합 분석 중...</p>
          <AnalysisStepIndicator step={step} showExtract={!!usedFile} fileType={fileType} />
        </Card>
      )}

      {/* 결과 */}
      {result && step === "done" && (
        <RightsResult result={result} rawText={rawText} />
      )}
    </div>
  );
}
