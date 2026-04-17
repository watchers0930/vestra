"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { addAnalysis } from "@/lib/store";
import { addNotification } from "@/lib/notification-client";
import type { AnalysisResult, SampleContract, InputMode } from "../types";

export function useContractAnalysis() {
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [contractText, setContractText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
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
    const allowedTypes = ["text/plain", "application/pdf"];
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
        const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
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
      setContractText(e.target?.result as string);
      setFileName(file.name);
      setError(null);
    };
    reader.onerror = () => setError("파일을 읽는 중 오류가 발생했습니다.");
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

  return {
    inputMode, setInputMode,
    contractText, setContractText,
    fileName,
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
