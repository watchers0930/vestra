"use client";

import { useState } from "react";
import {
  FileSearch,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Shield,
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  Database as DatabaseIcon,
} from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { addAnalysis } from "@/lib/store";
import { SAMPLE_REGISTRY_TEXT } from "@/lib/registry-parser";
import type { ParsedRegistry } from "@/lib/registry-parser";
import type { RiskScore } from "@/lib/risk-scoring";

type AnalysisStep = "idle" | "parsing" | "scoring" | "ai" | "done";

interface AnalysisResult {
  parsed: ParsedRegistry;
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

function ScoreGauge({ score, grade, label }: { score: number; grade: string; label: string }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const style = GRADE_STYLES[grade] || GRADE_STYLES.C;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={style.text}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold", style.text)}>{score}</span>
          <span className="text-xs text-secondary">/ 100</span>
        </div>
      </div>
      <div className={cn("mt-2 px-4 py-1 rounded-full text-sm font-semibold", style.bg, style.text)}>
        {grade}등급 · {label}
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: AnalysisStep }) {
  const steps = [
    { key: "parsing", icon: DatabaseIcon, label: "자체 파싱 엔진", sublabel: "정규식 패턴 매칭" },
    { key: "scoring", icon: Zap, label: "스코어링 알고리즘", sublabel: "가중치 정량 분석" },
    { key: "ai", icon: Brain, label: "AI 종합 의견", sublabel: "GPT-4o 해석" },
  ];

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
  const [rawText, setRawText] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState(850000000);
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGapgu, setShowGapgu] = useState(true);
  const [showEulgu, setShowEulgu] = useState(true);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);

  const loadSample = () => {
    setRawText(SAMPLE_REGISTRY_TEXT);
  };

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setResult(null);
    setError(null);

    // 1단계: 파싱
    setStep("parsing");
    await new Promise((r) => setTimeout(r, 800));

    // 2단계: 스코어링
    setStep("scoring");
    await new Promise((r) => setTimeout(r, 600));

    // 3단계: AI 의견
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

      // localStorage 저장
      addAnalysis({
        type: "registry",
        typeLabel: "등기분석",
        address: data.parsed.title.address || "직접 입력",
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSearch className="text-primary" size={28} />
          등기분석
        </h1>
        <p className="text-secondary mt-1">등기부등본 자동 파싱 + 리스크 스코어링</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">자체 파싱 엔진</span>
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">독자 스코어링 알고리즘</span>
          <span className="px-2 py-0.5 bg-gray-100 text-secondary text-[10px] font-medium rounded">AI 미사용 핵심분석</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 입력 영역 */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">등기부등본 원문 입력</h3>
              <button
                onClick={loadSample}
                className="px-3 py-1 text-xs text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
              >
                샘플 데이터
              </button>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"등기부등본 텍스트를 붙여넣으세요...\n\n【 표 제 부 】 (건물의 표시)\n...\n【 갑 구 】 (소유권에 관한 사항)\n...\n【 을 구 】 (소유권 이외의 권리에 관한 사항)\n..."}
              className="w-full h-64 px-3 py-2 rounded-lg border border-border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              disabled={step !== "idle" && step !== "done"}
            />
            <div className="text-right text-[10px] text-muted mt-1">
              {rawText.length.toLocaleString()}자 입력됨
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-sm mb-3">추정 시세 (선택)</h3>
            <input
              type="range"
              min={50000000}
              max={3000000000}
              step={10000000}
              value={estimatedPrice}
              onChange={(e) => setEstimatedPrice(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="text-right text-sm font-semibold text-primary">
              {formatKRW(estimatedPrice)}
            </div>
            <p className="text-[10px] text-muted mt-1">
              시세를 입력하면 근저당 비율 기반 리스크를 더 정확히 산출합니다
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={(step !== "idle" && step !== "done") || !rawText.trim()}
            className="w-full py-3 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {step !== "idle" && step !== "done" ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Shield size={18} />
            )}
            등기부등본 분석 실행
          </button>
        </div>

        {/* 결과 영역 */}
        <div className="space-y-4">
          {/* 분석 단계 표시 */}
          {step !== "idle" && step !== "done" && (
            <div className="bg-card rounded-xl border border-border p-4">
              <StepIndicator step={step} />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <>
              {/* 리스크 스코어 */}
              <div className="bg-card rounded-xl border border-border p-5">
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
                    grade={result.riskScore.grade}
                    label={result.riskScore.gradeLabel}
                  />
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary">감점 합계</span>
                      <span className="font-semibold text-red-600">-{result.riskScore.totalDeduction}점</span>
                    </div>
                    {result.riskScore.mortgageRatio > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-secondary">근저당 비율</span>
                        <span className="font-semibold">{result.riskScore.mortgageRatio.toFixed(1)}%</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary">현행 갑구</span>
                      <span className="font-semibold">{result.parsed.summary.activeGapguEntries}건</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary">현행 을구</span>
                      <span className="font-semibold">{result.parsed.summary.activeEulguEntries}건</span>
                    </div>
                    {result.parsed.summary.totalMortgageAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-secondary">근저당 총액</span>
                        <span className="font-semibold">{formatKRW(result.parsed.summary.totalMortgageAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 리스크 요인 */}
              {result.riskScore.factors.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-5">
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
                </div>
              )}

              {/* 표제부 */}
              {result.parsed.title.address && (
                <div className="bg-card rounded-xl border border-border p-5">
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
                </div>
              )}

              {/* 갑구 */}
              {result.parsed.gapgu.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-5">
                  <button
                    onClick={() => setShowGapgu(!showGapgu)}
                    className="w-full flex items-center justify-between"
                  >
                    <h4 className="font-semibold text-sm">
                      갑구 (소유권) — {result.parsed.gapgu.length}건
                    </h4>
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
                            {entry.holder && (
                              <div className="text-secondary">{entry.holder}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 을구 */}
              {result.parsed.eulgu.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-5">
                  <button
                    onClick={() => setShowEulgu(!showEulgu)}
                    className="w-full flex items-center justify-between"
                  >
                    <h4 className="font-semibold text-sm">
                      을구 (권리관계) — {result.parsed.eulgu.length}건
                    </h4>
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
                              {entry.holder && (
                                <span className="text-secondary">{entry.holder}</span>
                              )}
                              {entry.amount > 0 && (
                                <span className="font-semibold text-primary">{formatKRW(entry.amount)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* AI 종합 의견 */}
              {result.aiOpinion && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2 text-sm">
                    <Brain size={18} />
                    AI 종합 의견
                  </h4>
                  <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                    {result.aiOpinion}
                  </p>
                </div>
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
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileSearch size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">등기부등본 분석</h3>
              <p className="text-secondary text-sm mb-4 max-w-sm mx-auto">
                등기부등본 원문을 붙여넣으면 자체 파싱 엔진과
                리스크 스코어링 알고리즘으로 즉시 분석합니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center text-xs text-muted">
                <span className="flex items-center gap-1"><DatabaseIcon size={12} /> 자체 파싱 엔진</span>
                <span className="flex items-center gap-1"><Zap size={12} /> 독자 스코어링</span>
                <span className="flex items-center gap-1"><Brain size={12} /> AI 의견 (선택)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
