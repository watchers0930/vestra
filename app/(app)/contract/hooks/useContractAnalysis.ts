"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { addAnalysis } from "@/lib/store";
import { addNotification } from "@/lib/notification-client";
import type { ContractImageIntegrity } from "@/lib/contract-image";
import type { AnalysisResult, SampleContract, InputMode } from "../types";

export function useContractAnalysis() {
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [contractText, setContractText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [contractIntegrity, setContractIntegrity] = useState<ContractImageIntegrity | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const [analysisId, setAnalysisId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sampleMenuRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

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

  const readFile = useCallback(async (file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isPdf = ext === "pdf" || file.type === "application/pdf";
    const isImage =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      ext === "jpg" ||
      ext === "jpeg" ||
      ext === "png";
    const isTxt = file.type === "text/plain" || ext === "txt";

    if (!isPdf && !isImage && !isTxt) {
      setError(".txt, .pdf 또는 이미지(JPG·PNG) 파일만 업로드할 수 있습니다.");
      return;
    }

    // PDF·이미지(계약서 사진/스캔본) → 서버 OCR(extract-pdf)로 텍스트 추출
    if (isPdf || isImage) {
      setFileName(file.name);
      setError(null);
      setContractIntegrity(null);
      setContractText("");
      setIsExtracting(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("docType", "contract");
        const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setContractText(data.text);
        // 이미지 기반 무결성 신호(서명·날인·수기정정·공란 등) — 이미지 업로드에서만 제공
        setContractIntegrity(data.contractIntegrity ?? null);
        setError(null);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : isImage
              ? "이미지에서 텍스트 인식에 실패했습니다."
              : "PDF 텍스트 추출에 실패했습니다."
        );
        setFileName(null);
        setContractIntegrity(null);
      } finally {
        setIsExtracting(false);
      }
      return;
    }

    // txt → 클라이언트에서 직접 읽기
    setContractIntegrity(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setContractText(e.target?.result as string);
      setFileName(file.name);
      setError(null);
    };
    reader.onerror = () => setError("파일을 읽는 중 오류가 발생했습니다.");
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) readFile(file);
    },
    [readFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) readFile(file);
    },
    [readFile]
  );

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

      // 분석 히스토리 저장 (어시스턴트 컨텍스트용)
      try {
        const HISTORY_KEY = "vestra_analysis_history";
        const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        const termsCount = data.recommendedTerms?.terms?.length || 0;
        const issueCount = data.reviewIssues?.length || 0;
        existing.push({
          type: "contract",
          timestamp: new Date().toISOString(),
          summary: `안전점수 ${data.safetyScore}점, ${data.clauses?.length || 0}개 조항, 검토이슈 ${issueCount}건, 특약 ${termsCount}건 추천`,
          safetyScore: data.safetyScore,
          address: fileName || "직접 입력 계약서",
        });
        localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.slice(-3)));
      } catch { /* storage unavailable */ }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillSample = (sample: SampleContract) => {
    setContractText(sample.text);
    setFileName(null);
    setContractIntegrity(null);
    setError(null);
    setInputMode("text");
    setShowSampleMenu(false);
  };

  return {
    inputMode, setInputMode,
    contractText, setContractText,
    fileName,
    contractIntegrity,
    isExtracting,
    isLoading,
    result,
    error, setError,
    isDragging,
    showSampleMenu, setShowSampleMenu,
    analysisId,
    copied, setCopied,
    fileInputRef, sampleMenuRef, resultRef,
    handleDrop, handleDragOver, handleDragLeave,
    handleFileChange, handleAnalyze, fillSample,
  };
}
