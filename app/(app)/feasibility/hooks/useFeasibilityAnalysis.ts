"use client";

import { useState, useCallback, useEffect } from "react";
import { addAnalysis } from "@/lib/store";
import { generateFeasibilityReportHtml } from "@/lib/feasibility/report-html";
import { uploadFile } from "../lib/uploadFile";
import type { ScrDocumentCategory, ProjectType } from "@/lib/feasibility/scr-types";
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

export type Step = "upload" | "verify" | "report";

export function useFeasibilityAnalysis() {
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [files, setFiles] = useState<File[]>([]);
  const [categorizedFiles, setCategorizedFiles] = useState<Map<ScrDocumentCategory, File[]>>(new Map());
  const [projectType, setProjectType] = useState<ProjectType>("아파트");
  const [context, setContext] = useState<MergedProjectContext | null>(null);
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [parsedInfo, setParsedInfo] = useState<ParseResponse["parsedFiles"] | null>(null);

  // Step 2
  const [verifications, setVerifications] = useState<VerificationResult[]>([]);
  const [rationalityItems, setRationalityItems] = useState<RationalityItem[]>([]);

  // Step 3
  const [chapters, setChapters] = useState<ChapterOpinion[]>([]);
  const [vScore, setVScore] = useState<FeasibilityScore | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportHtml, setReportHtml] = useState<string | null>(null);

  const handleCategorizedFilesChange = useCallback((newMap: Map<ScrDocumentCategory, File[]>) => {
    setCategorizedFiles(newMap);
    const allFiles: File[] = [];
    newMap.forEach((fileList) => allFiles.push(...fileList));
    setFiles(allFiles);
  }, []);

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
        disclaimer: "본 보고서는 AI 기반 자동 분석 결과로, 투자 결정의 유일한 근거로 사용해서는 안 됩니다. 전문 감정평가사 또는 신용평가사의 검토를 권장합니다.",
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

  const runVerification = useCallback(async (ctx: MergedProjectContext, resolved: ResolvedConflict[]) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/feasibility/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: ctx, resolvedConflicts: resolved }),
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
  }, [parseJsonError]);

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
  }, [files, parseJsonError, runVerification]);

  const handleConflictsResolved = useCallback(
    async (resolved: ResolvedConflict[]) => {
      setStep("verify");
      if (context) await runVerification(context, resolved);
    },
    [context, runVerification]
  );

  const fetchReportHtml = useCallback(async () => {
    const inlineReport = buildInlineReport();
    if (!reportId && !inlineReport) throw new Error("보고서 데이터가 준비되지 않았습니다.");
    if (!reportId && inlineReport) return generateFeasibilityReportHtml(inlineReport);

    const res = await fetch("/api/feasibility/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });

    if (!res.ok) {
      const text = await res.text();
      const data = (() => { try { return JSON.parse(text) as { error?: string }; } catch { return null; } })();
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
        if (!cancelled) setReportHtml(html);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "보고서 미리보기 생성 실패");
      }
    })();

    return () => { cancelled = true; };
  }, [fetchReportHtml, reportHtml, reportId, step, vScore]);

  const handleOpenReport = useCallback(async () => {
    setLoading(true);
    try {
      const html = reportHtml || await fetchReportHtml();
      if (!reportHtml) setReportHtml(html);

      const popup = window.open("", "_blank");
      if (!popup) throw new Error("팝업이 차단되었습니다. 브라우저에서 팝업을 허용해주세요.");
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.onload = () => { setTimeout(() => popup.print(), 500); };
      if (popup.document.readyState === "complete") setTimeout(() => popup.print(), 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "보고서 열기 실패");
    } finally {
      setLoading(false);
    }
  }, [fetchReportHtml, reportHtml]);

  const handleReset = () => {
    setStep("upload");
    setFiles([]);
    setCategorizedFiles(new Map());
    setProjectType("아파트");
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

  return {
    step, loading, error,
    files, categorizedFiles, projectType, setProjectType,
    context, conflicts, parsedInfo,
    verifications, rationalityItems,
    chapters, vScore, reportHtml,
    handleCategorizedFilesChange,
    handleParse, handleConflictsResolved,
    handleOpenReport, handleReset,
  };
}
