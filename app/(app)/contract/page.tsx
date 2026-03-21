"use client";

import { useState, useRef, useCallback, useEffect, type RefObject } from "react";
import Link from "next/link";
import {
  FileSearch,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ClipboardPaste,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Landmark,
  Info,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addAnalysis } from "@/lib/store";
import { addNotification } from "@/lib/notification-client";
import { Card, Button, Badge, Alert } from "@/components/common";
import FeedbackWidget from "@/components/common/FeedbackWidget";
import { AnalysisLoader } from "@/components/common/AnalysisLoader";
import { ErrorRetry } from "@/components/common/ErrorRetry";
import { IntegrityBadge } from "@/components/common/IntegrityBadge";
import { NerHighlight } from "@/components/common/NerHighlight";
import AiDisclaimer from "@/components/common/ai-disclaimer";
import PdfDownloadButton from "@/components/common/pdf-download-button";
import { ScoreGauge } from "@/components/results";
import { LoadingSpinner } from "@/components/loading";

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
// Sample contracts
// ---------------------------------------------------------------------------

interface SampleContract {
  id: string;
  label: string;
  description: string;
  text: string;
}

const SAMPLE_CONTRACTS: SampleContract[] = [
  {
    id: "jeonse",
    label: "전세 계약서",
    description: "아파트 전세 3억, 특약 미비",
    text: `부동산 임대차계약서

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
임차인: 김철수 (인)`,
  },
  {
    id: "sale",
    label: "매매 계약서",
    description: "아파트 매매 9억, 근저당 존재",
    text: `부동산 매매계약서

[매도인] 박영수 (주민등록번호: 750315-1XXXXXX)
[매수인] 이지은 (주민등록번호: 880720-2XXXXXX)

제1조 (목적물의 표시)
소재지: 서울특별시 서초구 반포대로 45, 래미안아파트 102동 1503호
면적: 전용 114.82㎡ (약 34.7평)
용도: 주거용 (공동주택)
대지권: 대지권 비율 59.28㎡

제2조 (매매대금)
1. 매매대금: 금 900,000,000원 (구억원)
2. 대금 지급방법:
   - 계약금: 금 90,000,000원 (구천만원) - 계약 시 지급
   - 중도금: 금 360,000,000원 (삼억육천만원) - 2024년 5월 15일
   - 잔금: 금 450,000,000원 (사억오천만원) - 2024년 7월 1일

제3조 (소유권 이전)
1. 매도인은 잔금 수령일에 매수인에게 소유권이전등기에 필요한 모든 서류를 교부한다.
2. 소유권이전등기 비용은 매수인이 부담한다.
3. 매도인은 잔금일까지 목적물에 설정된 근저당권(채권최고액 금 480,000,000원, 근저당권자: 국민은행)을 말소하여야 한다.

제4조 (목적물의 인도)
1. 매도인은 잔금 수령일에 목적물을 매수인에게 인도한다.
2. 매도인은 인도일까지 공과금, 관리비 등 제세공과금을 정산하여야 한다.

제5조 (하자담보책임)
1. 매도인은 목적물의 주요 구조부에 대해 인도일로부터 6개월간 하자를 보수할 책임이 있다.
2. 매수인은 목적물의 현 상태를 확인하였으며, 경미한 하자에 대하여는 이의를 제기하지 아니한다.

제6조 (계약의 해제)
1. 매수인이 중도금 지급일까지 중도금을 지급하지 아니한 경우, 매도인은 서면 최고 후 계약을 해제할 수 있다.
2. 매도인의 귀책사유로 소유권이전이 불가능한 경우, 매수인은 계약을 해제하고 계약금의 배액을 청구할 수 있다.
3. 매수인은 중도금 지급 전까지 계약금을 포기하고 계약을 해제할 수 있고, 매도인은 계약금의 배액을 상환하고 계약을 해제할 수 있다.

제7조 (위약금)
당사자 일방이 본 계약을 위반한 경우, 그 상대방에게 매매대금의 10%에 해당하는 금액을 위약금으로 지급하여야 한다.

제8조 (특약사항)
1. 매도인은 잔금일까지 기존 근저당권(국민은행, 채권최고액 4.8억원)을 말소하기로 하며, 잔금에서 대출 상환금을 공제하고 수령하기로 한다.
2. 매도인은 잔금일 당일 국민은행 대출 상환과 동시에 근저당 말소서류를 매수인측 법무사에게 교부한다.
3. 본 매매 물건에 임차인(전세보증금 3억원, 만기 2024년 8월 31일)이 거주 중이며, 매도인은 잔금일 전까지 임차인의 보증금을 반환하고 퇴거를 완료시키기로 한다.
4. 중개보수는 법정 요율에 따르며, 매도인과 매수인이 각각 부담한다.

위 계약을 증명하기 위하여 이 계약서 2통을 작성하고 매도인과 매수인이 서명 날인한 후 각 1통씩 보관한다.

2024년 3월 20일

매도인: 박영수 (인)
매수인: 이지은 (인)
중개업자: 서초공인중개사사무소 (대표: 최민호)
등록번호: 11650-2019-00123`,
  },
  {
    id: "jeonse-loan",
    label: "전세+담보대출 계약서",
    description: "빌라 전세 2억, 근저당 과다 설정",
    text: `부동산 임대차계약서 (전세)

[임대인] 최성준 (주민등록번호: 700815-1XXXXXX)
[임차인] 정수빈 (주민등록번호: 950310-2XXXXXX)

제1조 (목적물의 표시)
소재지: 경기도 화성시 동탄대로 567, 동탄빌라 301호
면적: 전용 59.88㎡ (약 18.1평)
용도: 주거용 (다세대주택)

제2조 (계약기간)
임대차 기간은 2024년 4월 1일부터 2026년 3월 31일까지 2년으로 한다.

제3조 (보증금 및 차임)
1. 보증금: 금 200,000,000원 (이억원)
2. 월 차임: 없음 (전세계약)
3. 보증금 지급방법:
   - 계약금: 금 20,000,000원 (이천만원) - 계약 시 지급
   - 잔금: 금 180,000,000원 (일억팔천만원) - 2024년 4월 1일 (입주일)
4. 임차인은 전세자금대출(한국주택금융공사, 금 150,000,000원)을 이용하여 보증금을 지급할 수 있으며, 임대인은 이에 필요한 서류 협조의무가 있다.

제4조 (권리관계 고지)
1. 임대인은 본 계약 체결 시 목적물의 등기부등본을 교부하고 권리관계를 고지한다.
2. 현재 목적물에 설정된 담보권 현황:
   - 근저당권: 채권최고액 금 240,000,000원 (이억사천만원), 근저당권자: 신한은행 (2022.03.15 설정)
   - 근저당권: 채권최고액 금 120,000,000원 (일억이천만원), 근저당권자: 새마을금고 (2023.09.20 설정)
3. 임대인은 목적물의 시가가 약 350,000,000원임을 고지하며, 임차인은 담보권 설정 현황을 확인하였다.

제5조 (임대인의 의무)
1. 임대인은 계약기간 중 목적물의 사용·수익에 필요한 상태를 유지한다.
2. 임대인은 계약기간 중 추가 담보권 설정, 소유권 이전 등 임차인의 보증금 회수에 불리한 행위를 하지 아니한다.

제6조 (임차인의 의무)
1. 임차인은 목적물을 선량한 관리자의 주의로 사용하여야 한다.
2. 임차인은 임대인의 동의 없이 전대하거나 임차권을 양도할 수 없다.
3. 임차인은 입주 즉시 전입신고를 완료하여야 한다.

제7조 (계약의 해지)
1. 당사자 일방이 본 계약을 위반한 경우, 상대방은 상당한 기간을 정하여 이행을 최고하고, 불이행 시 계약을 해지할 수 있다.
2. 임대인이 보증금을 반환하지 않는 경우, 임차인은 임차권등기명령을 신청할 수 있다.

제8조 (원상회복)
임차인은 계약 종료 시 목적물을 원상에 회복하여 반환한다.

제9조 (특약사항)
1. 현 시설 상태 그대로 임대한다.
2. 임대인은 전세자금대출에 필요한 확정일자 및 전입신고 관련 서류에 협조한다.
3. 임대인은 보증금 반환을 위해 계약 만기 2개월 전까지 임차인에게 반환 일정을 통보한다.

위 계약을 증명하기 위하여 이 계약서 2통을 작성하고 임대인과 임차인이 서명 날인한 후 각 1통씩 보관한다.

2024년 3월 5일

임대인: 최성준 (인)
임차인: 정수빈 (인)
중개업자: 동탄공인중개사사무소 (대표: 한지영)
등록번호: 41590-2020-00456`,
  },
];

// ---------------------------------------------------------------------------
// Risk badge mapping
// ---------------------------------------------------------------------------

const riskBadgeVariant: Record<string, "danger" | "warning" | "success"> = {
  high: "danger",
  warning: "warning",
  safe: "success",
};
const riskBadgeLabel: Record<string, string> = {
  high: "위험",
  warning: "주의",
  safe: "안전",
};
const riskBadgeIcon: Record<string, typeof XCircle> = {
  high: XCircle,
  warning: AlertTriangle,
  safe: CheckCircle,
};

function getScoreLabel(score: number) {
  if (score >= 80) return "안전";
  if (score >= 50) return "주의";
  return "위험";
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
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const [analysisId, setAnalysisId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sampleMenuRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // ---- Close sample menu on outside click ----
  useEffect(() => {
    if (!showSampleMenu) return;
    const handler = (e: MouseEvent) => {
      if (sampleMenuRef.current && !sampleMenuRef.current.contains(e.target as Node)) {
        setShowSampleMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSampleMenu]);

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

      addAnalysis({
        type: "contract",
        typeLabel: "계약검토",
        address: fileName || "직접 입력 계약서",
        summary: `안전점수 ${data.safetyScore}점, ${data.clauses?.length || 0}개 조항 분석`,
        data: data as unknown as Record<string, unknown>,
      });

      addNotification(`계약검토 완료: ${fileName || "직접 입력 계약서"}`);
      setAnalysisId(`contract_${Date.now()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillSample = (sample: SampleContract) => {
    setContractText(sample.text);
    setFileName(null);
    setError(null);
    setInputMode("text");
    setShowSampleMenu(false);
  };

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

      {/* Input Card */}
      <Card className="p-6">
        {/* Tabs */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Button
            icon={ClipboardPaste}
            variant={inputMode === "text" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setInputMode("text")}
          >
            텍스트 입력
          </Button>
          <Button
            icon={Upload}
            variant={inputMode === "file" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setInputMode("file")}
          >
            파일 업로드
          </Button>

          <div className="hidden sm:block flex-1" />

          <div className="relative" ref={sampleMenuRef}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSampleMenu(!showSampleMenu)}
            >
              샘플 계약서 불러오기
            </Button>
            {showSampleMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-[#e5e5e7] bg-white shadow-lg py-1">
                {SAMPLE_CONTRACTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => fillSample(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#f5f5f7] transition-colors"
                  >
                    <div className="text-sm font-medium text-[#1d1d1f]">{s.label}</div>
                    <div className="text-xs text-[#6e6e73]">{s.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
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
            className="min-h-[300px] w-full resize-y rounded-lg border border-[#e5e5e7] bg-[#f5f5f7] p-4 text-sm leading-relaxed text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
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
                  : "border-[#e5e5e7] bg-[#f5f5f7] hover:border-[#6e6e73] hover:bg-[#e5e5e7]"
              )}
            >
              {fileName ? (
                <>
                  <FileText size={48} className="text-blue-500" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#1d1d1f]">{fileName}</p>
                    <p className="mt-1 text-xs text-[#6e6e73]">
                      파일이 선택되었습니다. 다른 파일을 선택하려면 클릭하세요.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload
                    size={48}
                    className={cn("transition-colors", isDragging ? "text-blue-500" : "text-[#6e6e73]")}
                  />
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#6e6e73]">
                      파일을 여기로 드래그하거나 클릭하여 업로드
                    </p>
                    <p className="mt-1 text-xs text-[#6e6e73]">.txt, .pdf 파일 지원</p>
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
          <div className="mt-2 text-right text-xs text-[#6e6e73]">
            {contractText.length.toLocaleString()}자 입력됨
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4">
            <ErrorRetry
              message={error}
              detail="계약서 내용을 확인하거나 다시 시도해주세요."
              onRetry={() => {
                setError(null);
                handleAnalyze();
              }}
            />
          </div>
        )}

        {/* Analyze Button */}
        <Button
          icon={isLoading ? undefined : FileSearch}
          loading={isLoading}
          disabled={!contractText.trim()}
          fullWidth
          size="lg"
          className="mt-5"
          onClick={handleAnalyze}
        >
          계약서 분석하기
        </Button>
      </Card>

      {/* 분석 진행 중 */}
      {isLoading && (
        <Card className="p-6">
          <p className="text-sm font-medium text-[#1d1d1f] text-center mb-2">계약서 AI 분석 중...</p>
          <AnalysisLoader
            steps={["계약서 텍스트 추출 중...", "조항 분석 중...", "판례 검색 중...", "AI 검토 의견 생성 중..."]}
            interval={3000}
          />
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Results                                                            */}
      {/* ------------------------------------------------------------------ */}
      {result && (
        <div ref={resultRef} className="space-y-6">
          {/* 결과 상단 액션 */}
          <div className="flex items-center justify-between">
            <AiDisclaimer compact />
            <PdfDownloadButton targetRef={resultRef} filename="vestra-contract-review.pdf" title="VESTRA 계약검토 리포트" />
          </div>
          {/* Safety Score + AI Opinion row */}
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            {/* Safety Score Card */}
            <Card className="flex flex-col items-center justify-center p-6">
              <h2 className="mb-4 text-sm font-semibold text-[#6e6e73]">계약 안전점수</h2>
              <ScoreGauge
                score={result.safetyScore}
                grade={getScoreLabel(result.safetyScore)}
              />
            </Card>

            {/* AI Opinion Card */}
            <Card className="p-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#6e6e73]">
                <FileSearch size={16} strokeWidth={1.5} className="text-[#1d1d1f]" />
                AI 종합 의견
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[#1d1d1f]">
                {result.aiOpinion}
              </p>
            </Card>
          </div>

          {/* Clauses Analysis */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-[#1d1d1f]">조항별 분석 결과</h2>
            <div className="space-y-4">
              {result.clauses.map((clause, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-lg border border-[#e5e5e7] border-l-4 bg-[#f5f5f7]/50 p-4",
                    borderForRisk(clause.riskLevel)
                  )}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">{clause.title}</h3>
                    <Badge variant={riskBadgeVariant[clause.riskLevel]} icon={riskBadgeIcon[clause.riskLevel]} size="md">
                      {riskBadgeLabel[clause.riskLevel]}
                    </Badge>
                  </div>
                  {clause.content && (
                    <p className="mb-2 rounded bg-white px-3 py-2 text-xs leading-relaxed text-[#6e6e73] ring-1 ring-[#e5e5e7]">
                      {clause.content}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-[#1d1d1f]">{clause.analysis}</p>
                  {clause.relatedLaw && (
                    <p className="mt-2 text-xs text-[#6e6e73]">
                      <span className="font-medium text-[#6e6e73]">관련 법규:</span>{" "}
                      {clause.relatedLaw}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Missing Clauses */}
          {result.missingClauses.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[#1d1d1f]">
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
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">{mc.title}</h3>
                      <Badge variant={mc.importance === "high" ? "danger" : "warning"} size="md">
                        {mc.importance === "high" ? "필수" : "권장"}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-[#6e6e73]">{mc.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {/* 계약 시 안전 체크리스트 */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[#1d1d1f]">
              <ShieldAlert size={18} className="text-amber-500" />
              계약 전 안전 체크리스트
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                <div className="flex items-start gap-2.5">
                  <Landmark size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">세금 체납 확인</p>
                    <p className="mt-1 text-xs leading-relaxed text-red-600">
                      임대인의 <strong>국세·지방세 완납증명원</strong>을 요구하세요.
                      체납 세금은 근저당보다 우선 변제되어 보증금 회수에 직접 영향을 줍니다.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-orange-800">등기부 말소 이력 확인</p>
                    <p className="mt-1 text-xs leading-relaxed text-orange-600">
                      등기부를 <strong>&apos;말소 사항 포함&apos;</strong>으로 발급받아 과거 이력을 확인하고,
                      최근 말소된 근저당은 해당 은행에 직접 정상 상환 여부를 확인하세요.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">전세보증보험 가입</p>
                    <p className="mt-1 text-xs leading-relaxed text-blue-600">
                      <strong>HUG</strong> 또는 <strong>SGI</strong>의 전세보증금반환보증에
                      반드시 가입하세요.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
                <div className="flex items-start gap-2.5">
                  <Shield size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">권원보험 (Title Insurance)</p>
                    <p className="mt-1 text-xs leading-relaxed text-indigo-600">
                      소유권 사기·서류 위조 피해를 보상하는 보험입니다.
                      매매가 3억 기준 약 <strong>10~15만원</strong>으로 가입 가능합니다.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 sm:col-span-2">
                <div className="flex items-start gap-2.5">
                  <FileText size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">등기 상태 유지 특약</p>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-600">
                      <strong>&quot;잔금일까지 등기 상태 유지, 위반 시 계약 해제 및 배액 배상&quot;</strong> 특약을
                      반드시 기재하세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-600">
              <Info size={12} />
              <span>등기부등본에는 법적 &apos;공신력&apos;이 없습니다. 등기 내용이 실제와 달라도 국가가 보호하지 않으므로 위 항목을 반드시 확인하세요.</span>
            </div>
          </Card>

          {/* 무결성 검증 배지 */}
          <IntegrityBadge />

          {/* NER 개체명 인식 (계약서 원본) */}
          {contractText && (
            <Card className="p-6">
              <NerHighlight text={contractText} />
            </Card>
          )}

          {/* 피드백 위젯 */}
          {analysisId && <FeedbackWidget analysisId={analysisId} className="mt-4" />}

          {/* 면책 조항 */}
          <Alert variant="warning">
            <strong>면책 조항</strong><br />
            본 분석은 AI 및 자체 분석 엔진에 의한 참고용 정보이며, 법률적 조언이 아닙니다.
            계약서의 법적 효력 및 유불리 판단은 반드시 변호사, 법무사 등 법률 전문가와 상담하시기 바랍니다.
            VESTRA는 본 분석 결과에 따른 계약 체결 및 손해에 대해 책임을 지지 않습니다.
          </Alert>

          {/* 연관 분석 CTA */}
          <div className="mt-6 p-4 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7]">
            <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider mb-3">이 물건으로 추가 분석</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/rights"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e5e7] bg-white text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all"
              >
                <Shield size={16} strokeWidth={1.5} />
                이 물건의 권리분석
              </Link>
              <Link
                href="/tax"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e5e7] bg-white text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all"
              >
                <Calculator size={16} strokeWidth={1.5} />
                세금 시뮬레이션
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
