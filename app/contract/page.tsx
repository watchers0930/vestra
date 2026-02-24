"use client";

import { useState, useRef, useCallback } from "react";
import {
  FileSearch,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ClipboardPaste,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addAnalysis } from "@/lib/store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyzedClause {
  title: string;
  content: string;
  riskLevel: "high" | "warning" | "safe";
  analysis: string;
  relatedLaw: string;
}

interface MissingClause {
  title: string;
  importance: "high" | "medium";
  description: string;
}

interface AnalysisResult {
  clauses: AnalyzedClause[];
  missingClauses: MissingClause[];
  safetyScore: number;
  aiOpinion: string;
}

// ---------------------------------------------------------------------------
// Sample contract
// ---------------------------------------------------------------------------

const SAMPLE_CONTRACT = `부동산 임대차계약서

[임대인] 홍길동 (주민등록번호: 800101-1XXXXXX)
[임차인] 김철수 (주민등록번호: 900202-1XXXXXX)

제1조 (목적물의 표시)
소재지: 서울특별시 강남구 테헤란로 123, 456동 789호
면적: 전용 84.95㎡ (약 25.7평)
용도: 주거용

제2조 (계약기간)
임대차 기간은 2024년 3월 1일부터 2026년 2월 28일까지 2년으로 한다.

제3조 (보증금 및 차임)
1. 보증금: 금 300,000,000원 (삼억원)
2. 월 차임: 없음 (전세계약)
3. 보증금 지급방법:
   - 계약 시: 금 30,000,000원 (삼천만원)
   - 중도금: 금 120,000,000원 (일억이천만원) - 2024년 2월 1일
   - 잔금: 금 150,000,000원 (일억오천만원) - 2024년 3월 1일 (입주일)

제4조 (임대인의 의무)
1. 임대인은 임차인에게 목적물을 인도하고, 계약기간 중 그 사용 및 수익에 필요한 상태를 유지하여야 한다.
2. 임대인은 계약 체결 시 목적물의 권리관계를 명확히 고지하여야 한다.

제5조 (임차인의 의무)
1. 임차인은 목적물을 선량한 관리자의 주의로 사용하여야 한다.
2. 임차인은 임대인의 동의 없이 목적물을 전대하거나 임차권을 양도할 수 없다.

제6조 (계약의 해지)
1. 임차인이 2회 이상 차임을 연체한 경우 임대인은 계약을 해지할 수 있다.
2. 천재지변 등 불가항력으로 목적물을 사용할 수 없는 경우 각 당사자는 계약을 해지할 수 있다.

제7조 (원상회복)
임차인은 계약이 종료된 때에 목적물을 원상에 회복하여 임대인에게 반환하여야 한다.

제8조 (특약사항)
1. 현 시설 상태 그대로 임대하며, 입주 후 수리비는 임차인 부담으로 한다.
2. 반려동물 사육을 금지한다.

위 계약을 증명하기 위하여 이 계약서 2통을 작성하고 임대인과 임차인이 서명 날인한 후 각 1통씩 보관한다.

2024년 1월 15일

임대인: 홍길동 (인)
임차인: 김철수 (인)`;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RiskBadge({ level }: { level: "high" | "warning" | "safe" }) {
  const config = {
    high: {
      label: "위험",
      icon: XCircle,
      className: "bg-red-50 text-red-700 border-red-200",
    },
    warning: {
      label: "주의",
      icon: AlertTriangle,
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    safe: {
      label: "안전",
      icon: CheckCircle,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  } as const;

  const c = config[level];
  const Icon = c.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        c.className
      )}
    >
      <Icon size={12} />
      {c.label}
    </span>
  );
}

function ImportanceBadge({ importance }: { importance: "high" | "medium" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        importance === "high"
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      )}
    >
      {importance === "high" ? "필수" : "권장"}
    </span>
  );
}

function SafetyScoreCircle({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let color: string;
  let label: string;
  if (score >= 80) {
    color = "#10b981";
    label = "안전";
  } else if (score >= 50) {
    color = "#f59e0b";
    label = "주의";
  } else {
    color = "#ef4444";
    label = "위험";
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      <span
        className="rounded-full px-3 py-1 text-sm font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

type InputMode = "text" | "file";

export default function ContractReviewPage() {
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [contractText, setContractText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- File handling ----

  const readFile = useCallback(async (file: File) => {
    if (!file) return;

    const allowedTypes = [
      "text/plain",
      "application/pdf",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && ext !== "txt" && ext !== "pdf") {
      setError(".txt 또는 .pdf 파일만 업로드할 수 있습니다.");
      return;
    }

    if (ext === "pdf" || file.type === "application/pdf") {
      // PDF 파일 → 서버사이드 텍스트 추출
      setFileName(file.name);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/extract-pdf", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setContractText(data.text);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "PDF 텍스트 추출에 실패했습니다.");
        setFileName(null);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContractText(text);
      setFileName(file.name);
      setError(null);
    };
    reader.onerror = () => {
      setError("파일을 읽는 중 오류가 발생했습니다.");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) readFile(file);
    },
    [readFile]
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
      if (file) readFile(file);
    },
    [readFile]
  );

  // ---- Analysis ----

  const handleAnalyze = async () => {
    if (!contractText.trim()) {
      setError("계약서 내용을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractText: contractText.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `서버 오류가 발생했습니다 (${res.status})`);
      }

      const data: AnalysisResult = await res.json();
      setResult(data);

      // localStorage에 분석 결과 저장
      addAnalysis({
        type: "contract",
        typeLabel: "계약검토",
        address: fileName || "직접 입력 계약서",
        summary: `안전점수 ${data.safetyScore}점, ${data.clauses?.length || 0}개 조항 분석`,
        data: data as unknown as Record<string, unknown>,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillSample = () => {
    setContractText(SAMPLE_CONTRACT);
    setFileName(null);
    setError(null);
    setInputMode("text");
  };

  // ---- Border color for clause risk ----
  const borderForRisk = (level: "high" | "warning" | "safe") => {
    switch (level) {
      case "high":
        return "border-l-red-500";
      case "warning":
        return "border-l-amber-400";
      case "safe":
        return "border-l-emerald-500";
    }
  };

  // ---- Render ----

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <FileSearch size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">계약검토</h1>
            <p className="text-sm text-gray-500">
              AI 기반 부동산 계약서 자동 분석
            </p>
          </div>
        </div>
      </div>

      {/* Input Card */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {/* Tabs */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setInputMode("text")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              inputMode === "text"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <ClipboardPaste size={16} />
            텍스트 입력
          </button>
          <button
            onClick={() => setInputMode("file")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              inputMode === "file"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Upload size={16} />
            파일 업로드
          </button>

          <div className="hidden sm:block flex-1" />

          <button
            onClick={fillSample}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            샘플 계약서 불러오기
          </button>
        </div>

        {/* Text Input Mode */}
        {inputMode === "text" && (
          <textarea
            value={contractText}
            onChange={(e) => {
              setContractText(e.target.value);
              setError(null);
            }}
            placeholder="계약서 내용을 여기에 붙여넣으세요...&#10;&#10;예시: 부동산 임대차계약서, 매매계약서 등의 전문을 입력하면 AI가 조항별로 분석합니다."
            className="min-h-[300px] w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
          />
        )}

        {/* File Upload Mode */}
        {inputMode === "file" && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex min-h-[300px] cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed transition-colors",
                isDragging
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
              )}
            >
              {fileName ? (
                <>
                  <FileText size={48} className="text-blue-500" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      {fileName}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      파일이 선택되었습니다. 다른 파일을 선택하려면 클릭하세요.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload
                    size={48}
                    className={cn(
                      "transition-colors",
                      isDragging ? "text-blue-500" : "text-gray-400"
                    )}
                  />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">
                      파일을 여기로 드래그하거나 클릭하여 업로드
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      .txt, .pdf 파일 지원
                    </p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </>
        )}

        {/* Char count */}
        {contractText && (
          <div className="mt-2 text-right text-xs text-gray-400">
            {contractText.length.toLocaleString()}자 입력됨
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !contractText.trim()}
          className={cn(
            "mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors",
            isLoading || !contractText.trim()
              ? "cursor-not-allowed bg-gray-200 text-gray-400"
              : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <FileSearch size={18} />
              계약서 분석하기
            </>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Results                                                            */}
      {/* ------------------------------------------------------------------ */}
      {result && (
        <div className="space-y-6">
          {/* Safety Score + AI Opinion row */}
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            {/* Safety Score Card */}
            <div className="flex flex-col items-center justify-center rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-4 text-sm font-semibold text-gray-500">
                계약 안전점수
              </h2>
              <SafetyScoreCircle score={result.safetyScore} />
            </div>

            {/* AI Opinion Card */}
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
                <FileSearch size={16} className="text-blue-500" />
                AI 종합 의견
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {result.aiOpinion}
              </p>
            </div>
          </div>

          {/* Clauses Analysis */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-base font-semibold text-gray-800">
              조항별 분석 결과
            </h2>
            <div className="space-y-4">
              {result.clauses.map((clause, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-lg border border-gray-100 border-l-4 bg-gray-50/50 p-4",
                    borderForRisk(clause.riskLevel)
                  )}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {clause.title}
                    </h3>
                    <RiskBadge level={clause.riskLevel} />
                  </div>
                  {clause.content && (
                    <p className="mb-2 rounded bg-white px-3 py-2 text-xs leading-relaxed text-gray-500 ring-1 ring-gray-100">
                      {clause.content}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-gray-700">
                    {clause.analysis}
                  </p>
                  {clause.relatedLaw && (
                    <p className="mt-2 text-xs text-gray-400">
                      <span className="font-medium text-gray-500">관련 법규:</span>{" "}
                      {clause.relatedLaw}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Missing Clauses */}
          {result.missingClauses.length > 0 && (
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
                <AlertTriangle size={18} className="text-amber-500" />
                누락된 중요 조항
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.missingClauses.map((mc, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-lg border p-4",
                      mc.importance === "high"
                        ? "border-red-200 bg-red-50/50"
                        : "border-amber-200 bg-amber-50/50"
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-800">
                        {mc.title}
                      </h3>
                      <ImportanceBadge importance={mc.importance} />
                    </div>
                    <p className="text-xs leading-relaxed text-gray-600">
                      {mc.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
