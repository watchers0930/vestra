"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/common";
import AiDisclaimer from "@/components/common/ai-disclaimer";
import { StepIndicator } from "@/components/loading/StepIndicator";
import { FileUploadZone } from "@/components/feasibility/FileUploadZone";
import { ConflictResolver } from "@/components/feasibility/ConflictResolver";
import { ClaimVerificationTable } from "@/components/feasibility/ClaimVerificationTable";
import { RationalityBandChart } from "@/components/feasibility/RationalityBandChart";
import { ChapterReview } from "@/components/feasibility/ChapterReview";
import { FeasibilityScoreSummary } from "@/components/feasibility/FeasibilityScoreSummary";
import { FeasibilityReportPreview } from "@/components/feasibility/FeasibilityReportPreview";
import { generateFeasibilityReportHtml } from "@/lib/feasibility/report-html";
import { addAnalysis } from "@/lib/store";
import { ClipboardCheck, FileSearch, ExternalLink, RotateCcw, AlertCircle } from "lucide-react";
import type {
  FeasibilityReport,
  MergedProjectContext,
  DataConflict,
  ResolvedConflict,
  VerificationResult,
  RationalityItem,
  ChapterOpinion,
  FeasibilityScore,
  ParseResponse,
  VerifyResponse,
} from "@/lib/feasibility/feasibility-types";

type Step = "upload" | "verify" | "report";

/** Vercel 서버리스 body 제한(4.5MB) 우회: 4MB 이상 파일은 gzip 압축 후 전송 */
const COMPRESS_THRESHOLD = 4 * 1024 * 1024; // 4MB
const MAX_COMPRESSED_SIZE = 4 * 1024 * 1024; // 압축 후 최대 크기

async function uploadFile(file: File): Promise<Response> {
  if (file.size <= COMPRESS_THRESHOLD) {
    const formData = new FormData();
    formData.append("file", file);
    return fetch("/api/feasibility/parse", {
      method: "POST",
      body: formData,
    });
  }

  if (typeof CompressionStream === "undefined") {
    throw new Error(
      `${file.name}: 파일 크기(${(file.size / 1024 / 1024).toFixed(1)}MB)가 서버 제한을 초과합니다. ` +
      "최신 브라우저를 사용하거나 파일 크기를 4MB 이하로 줄여주세요."
    );
  }

  const compressed = await new Response(
    file.stream().pipeThrough(new CompressionStream("gzip"))
  ).arrayBuffer();

  if (compressed.byteLength > MAX_COMPRESSED_SIZE) {
    throw new Error(
      `${file.name}: 파일이 너무 큽니다 (압축 후 ${(compressed.byteLength / 1024 / 1024).toFixed(1)}MB). ` +
      "4MB 이하의 파일을 사용해주세요."
    );
  }

  return fetch("/api/feasibility/parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
      "X-Compressed": "gzip",
    },
    body: compressed,
  });
}

const STEPS = ["문서 업로드", "검증 분석", "보고서 생성"];

function stepToIndex(step: Step): number {
  switch (step) {
    case "upload": return 0;
    case "verify": return 1;
    case "report": return 2;
  }
}

export default function FeasibilityPage() {
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [context, setContext] = useState<MergedProjectContext | null>(null);
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [parsedInfo, setParsedInfo] = useState<ParseResponse["parsedFiles"] | null>(null);

  // Step 2: Verification state
  const [verifications, setVerifications] = useState<VerificationResult[]>([]);
  const [rationalityItems, setRationalityItems] = useState<RationalityItem[]>([]);

  // Step 3: Report state
  const [chapters, setChapters] = useState<ChapterOpinion[]>([]);
  const [vScore, setVScore] = useState<FeasibilityScore | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportHtml, setReportHtml] = useState<string | null>(null);

  const buildInlineReport = useCallback((): FeasibilityReport | null => {
    if (!context || !vScore) return null;

    return {
      id: reportId || "preview",
      projectContext: context,
      verificationResults: verifications,
      rationalityItems,
      chapters,
      vScore,
      metadata: {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        sourceFiles: context.sourceFiles.map((file) => file.filename),
        disclaimer:
          "본 보고서는 AI 기반 자동 분석 결과로, 투자 결정의 유일한 근거로 사용해서는 안 됩니다. 전문 감정평가사 또는 신용평가사의 검토를 권장합니다.",
      },
    };
  }, [chapters, context, rationalityItems, reportId, verifications, vScore]);

  const parseJsonError = useCallback((text: string, fallback: string) => {
    try {
      const parsed = JSON.parse(text) as { error?: string };
      return parsed.error || fallback;
    } catch {
      return text || fallback;
    }
  }, []);

  // ------ Step 1: Parse (파일별 순차 업로드 → merge) ------
  const handleParse = useCallback(async () => {
    if (!files.length) return;
    setLoading(true);
    setError(null);

    try {
      const parsedDocs = [];
      for (const file of files) {
        const res = await uploadFile(file);

        const text = await res.text();
        if (!res.ok) throw new Error(parseJsonError(text, `${file.name} 분석 실패`));
        const result = JSON.parse(text) as { parsed: import("@/lib/feasibility/feasibility-types").ParsedDocument };
        parsedDocs.push(result.parsed);
      }

      const mergeRes = await fetch("/api/feasibility/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsedDocs }),
      });

      const mergeText = await mergeRes.text();
      if (!mergeRes.ok) throw new Error(parseJsonError(mergeText, "문서 병합 실패"));
      const data = JSON.parse(mergeText) as ParseResponse & { error?: string };

      setContext(data.context);
      setConflicts(data.conflicts || []);
      setParsedInfo(data.parsedFiles);

      if (!data.conflicts?.length) {
        setStep("verify");
        await runVerification(data.context, []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "문서 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [files, parseJsonError]);

  // ------ 불일치 해결 후 검증 진행 ------
  const handleConflictsResolved = useCallback(
    async (resolved: ResolvedConflict[]) => {
      setStep("verify");
      if (context) {
        await runVerification(context, resolved);
      }
    },
    [context]
  );

  // ------ Step 2: Verify ------
  const runVerification = async (
    ctx: MergedProjectContext,
    resolved: ResolvedConflict[]
  ) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/feasibility/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: ctx,
          resolvedConflicts: resolved,
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(parseJsonError(text, "검증 분석 실패"));
      const data = text ? JSON.parse(text) as VerifyResponse & { error?: string } : null;
      if (!data) throw new Error("검증 분석 응답이 비어 있습니다.");

      setReportId(data.reportId);
      setVerifications(data.verifications);
      setRationalityItems(data.rationalityItems);
      setChapters(data.chapters);
      setVScore(data.vScore);
      setReportHtml(null);
      setStep("report");

      addAnalysis({
        type: "feasibility",
        typeLabel: "사업성 분석",
        address: ctx.location.address || ctx.projectName,
        summary: `사업성 등급: ${data.vScore.grade} (${data.vScore.score}점)`,
        data: { reportId: data.reportId },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "검증 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ------ 보고서 HTML 생성 ------
  const fetchReportHtml = useCallback(async () => {
    const inlineReport = buildInlineReport();
    if (!reportId && !inlineReport) {
      throw new Error("보고서 데이터가 준비되지 않았습니다.");
    }

    if (!reportId && inlineReport) {
      return generateFeasibilityReportHtml(inlineReport);
    }

    const res = await fetch("/api/feasibility/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });

    if (!res.ok) {
      const text = await res.text();
      const data = (() => {
        try {
          return JSON.parse(text) as { error?: string };
        } catch {
          return null;
        }
      })();
      throw new Error(data?.error || text || "보고서 생성 실패");
    }

    return res.text();
  }, [buildInlineReport, reportId]);

  useEffect(() => {
    if (step !== "report" || reportHtml || (!reportId && !vScore)) return;

    let cancelled = false;

    void (async () => {
      try {
        const html = await fetchReportHtml();
        if (!cancelled) {
          setReportHtml(html);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "보고서 미리보기 생성 실패");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchReportHtml, reportHtml, reportId, step, vScore]);

  const handleOpenReport = useCallback(async () => {
    setLoading(true);

    try {
      const html = reportHtml || await fetchReportHtml();
      if (!reportHtml) {
        setReportHtml(html);
      }

      const popup = window.open("", "_blank");
      if (!popup) {
        throw new Error("팝업이 차단되었습니다. 브라우저에서 팝업을 허용해주세요.");
      }

      popup.document.open();
      popup.document.write(html);
      popup.document.close();

      // PDF 저장을 위한 인쇄 대화상자 자동 호출
      popup.onload = () => {
        setTimeout(() => popup.print(), 500);
      };
      // onload가 이미 완료된 경우 대비
      if (popup.document.readyState === "complete") {
        setTimeout(() => popup.print(), 500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "보고서 열기 실패");
    } finally {
      setLoading(false);
    }
  }, [fetchReportHtml, reportHtml]);

  // ------ 초기화 ------
  const handleReset = () => {
    setStep("upload");
    setFiles([]);
    setContext(null);
    setConflicts([]);
    setParsedInfo(null);
    setVerifications([]);
    setRationalityItems([]);
    setChapters([]);
    setVScore(null);
    setReportId(null);
    setReportHtml(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
            <ClipboardCheck size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1d1d1f]">사업성 분석 보고서</h1>
            <p className="text-sm text-[#86868b]">다중 문서 기반 사업성 검증 보고서를 생성합니다.</p>
          </div>
        </div>
      </div>

      {/* Step Progress */}
      <div className="px-4">
        <StepIndicator steps={STEPS} currentStep={stepToIndex(step)} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">오류가 발생했습니다</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: 문서 업로드 */}
      {step === "upload" && (
        <div className="space-y-4">
          <FileUploadZone files={files} onChange={setFiles} loading={loading} />

          {/* 파싱 결과 미리보기 */}
          {parsedInfo && (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
              <p className="text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-3">파싱 결과</p>
              <div className="space-y-2">
                {parsedInfo.map((f) => (
                  <div key={f.filename} className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-gray-50/80">
                    <span className="font-medium text-[#1d1d1f]">{f.filename}</span>
                    <div className="flex items-center gap-3 text-[#86868b]">
                      <span>{f.extractedCount}개 항목</span>
                      {typeof f.pageCount === "number" && <span>{f.pageCount}p</span>}
                      <span>{(f.fileSize / (1024 * 1024)).toFixed(1)}MB</span>
                      <span className="font-mono text-emerald-600">신뢰도 {f.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 불일치 해결 */}
          {conflicts.length > 0 && (
            <ConflictResolver
              conflicts={conflicts}
              onResolve={handleConflictsResolved}
            />
          )}

          {/* 분석 시작 버튼 */}
          {conflicts.length === 0 && (
            <Button
              onClick={handleParse}
              loading={loading}
              disabled={!files.length}
              icon={FileSearch}
              fullWidth
              size="lg"
            >
              문서 분석 시작
            </Button>
          )}
        </div>
      )}

      {/* Step 2: 검증 분석 (로딩) */}
      {step === "verify" && loading && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm py-16 text-center">
          <div className="relative w-12 h-12 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-base font-semibold text-[#1d1d1f]">사업성 검증 분석 중...</p>
          <p className="text-sm text-[#86868b] mt-1.5">공공데이터 교차 검증 및 AI 의견 생성 중입니다</p>
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 3: 보고서 결과 */}
      {step === "report" && vScore && (
        <div className="space-y-5">
          <FeasibilityScoreSummary score={vScore} chapters={chapters} />
          <ClaimVerificationTable claims={verifications} />
          <RationalityBandChart items={rationalityItems} />

          {/* 장별 검토 의견 */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#86868b] uppercase tracking-wider px-1">
              장별 검토 의견
            </h2>
            {chapters.map((ch) => (
              <ChapterReview key={ch.chapterId} chapter={ch} />
            ))}
          </div>

          {reportHtml && <FeasibilityReportPreview html={reportHtml} />}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleOpenReport}
              loading={loading}
              icon={ExternalLink}
              size="lg"
              className="flex-1"
            >
              보고서 열기 / PDF 저장
            </Button>
            <Button
              onClick={handleReset}
              variant="secondary"
              icon={RotateCcw}
              size="lg"
            >
              새 분석
            </Button>
          </div>

          <AiDisclaimer />
        </div>
      )}
    </div>
  );
}
