"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { addAnalysis, addOrUpdateAsset, getLatestAnalysisForAddress } from "@/lib/store";
import { addNotification } from "@/lib/notification-client";
import { SAMPLE_REGISTRY_TEXT } from "@/lib/registry-parser";
import type { UnifiedResult } from "@/components/rights/RightsResult";
import type { InputMode, AnalysisStep } from "../types";

export function useRightsAnalysis() {
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
  const [analysisId, setAnalysisId] = useState<string>("");
  const [previousAnalysis, setPreviousAnalysis] = useState<{ date: string; summary: string } | null>(null);
  const [codefAddress, setCodefAddress] = useState("");
  const [codefFetching, setCodefFetching] = useState(false);
  const [codefSource, setCodefSource] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const lastAddr = localStorage.getItem("vestra_last_address");
    if (lastAddr) {
      const prev = getLatestAnalysisForAddress(lastAddr);
      if (prev) {
        setPreviousAnalysis({
          date: new Date(prev.date).toLocaleDateString("ko-KR"),
          summary: prev.summary,
        });
      }
    }
  }, []);

  const loadSample = () => {
    setRawText(SAMPLE_REGISTRY_TEXT);
    setFileName(null);
    setFileType(null);
    setCodefSource(false);
    setInputMode("text");
  };

  const handleAddressAnalyze = async () => {
    const addr = codefAddress.trim();
    if (!addr || addr.length < 4) return;
    setCodefFetching(true);
    setError(null);
    setResult(null);

    try {
      const geoRes = await fetch(`/api/analyze-unified?address=${encodeURIComponent(addr)}`);
      const geoData = await geoRes.json();
      if (geoData.error) throw new Error(geoData.error);

      const b = geoData.building;
      const p = geoData.price;
      const lines: string[] = ["【 표 제 부 】", "", `소재지번: ${addr}`];
      if (b?.buildingName) lines.push(`건물명칭: ${b.buildingName}`);
      if (b?.totalArea) lines.push(`연면적: ${b.totalArea}㎡`);
      if (b?.mainPurpose) lines.push(`주용도: ${b.mainPurpose}`);
      if (b?.structure) lines.push(`구조: ${b.structure}`);
      if (b?.buildYear) lines.push(`건축년도: ${b.buildYear}년`);
      if (b?.floors) lines.push(`지상층수: ${b.floors}층`);
      if (b?.households) lines.push(`세대수: ${b.households}세대`);
      if (p?.sale) {
        lines.push("", "─── 실거래가 정보 ───");
        lines.push(`평균 매매가: ${p.sale.avgPrice.toLocaleString()}원`);
        lines.push(`최근거래: ${p.sale.period} (${p.sale.transactionCount}건)`);
      }
      if (p?.rent?.avgDeposit) {
        lines.push(`전세 평균가: ${p.rent.avgDeposit.toLocaleString()}원`);
        if (p.jeonseRatio) lines.push(`전세가율: ${p.jeonseRatio.toFixed(1)}%`);
      }
      lines.push("", "【 갑 구 】 (소유권에 관한 사항)");
      lines.push("※ 등기부등본 미제출 — 공공데이터 기반 간이 분석");
      lines.push("", "【 을 구 】 (소유권 이외의 권리에 관한 사항)");
      lines.push("※ 등기부등본 미제출 — 권리관계 직접 확인 필요");
      const syntheticText = lines.join("\n");

      const autoPrice = p?.sale?.avgPrice || p?.rent?.avgDeposit || 0;
      if (autoPrice > 0) setEstimatedPrice(autoPrice);
      const priceForAnalysis = autoPrice > 0 ? autoPrice : estimatedPrice;

      setCodefSource(true);
      setFileName(null);
      setFileType(null);

      setStep("codef-fetch"); await new Promise((r) => setTimeout(r, 400));
      setStep("parsing"); await new Promise((r) => setTimeout(r, 600));
      setStep("validating"); await new Promise((r) => setTimeout(r, 400));
      setStep("scoring"); await new Promise((r) => setTimeout(r, 400));
      setStep("molit"); await new Promise((r) => setTimeout(r, 300));
      setStep("ai");

      const res = await fetch("/api/analyze-unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: syntheticText, estimatedPrice: priceForAnalysis, source: "address" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setRawText(syntheticText);
      setResult(data);
      setStep("done");

      addAnalysis({
        type: "rights", typeLabel: "권리분석", address: addr,
        summary: `${data.riskScore?.grade || "?"}등급 (${data.riskScore?.gradeLabel || ""}, ${data.riskScore?.totalScore || 0}점) | 간이분석`,
        data: data as unknown as Record<string, unknown>,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석에 실패했습니다.");
      setStep("idle");
    } finally {
      setCodefFetching(false);
    }
  };

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const firstFile = files[0];
    const ext = firstFile.name.split(".").pop()?.toLowerCase();
    const isPdf = ext === "pdf" || firstFile.type === "application/pdf";
    const isImage = ["jpg", "jpeg", "png"].includes(ext || "") || firstFile.type.startsWith("image/");

    if (!isPdf && !isImage) { setError("PDF, JPG, PNG 파일만 업로드할 수 있습니다."); return; }
    const uploadFiles = isPdf ? [firstFile] : files.slice(0, 5);
    for (const file of uploadFiles) {
      if (file.size > 10 * 1024 * 1024) { setError(`파일 크기가 10MB를 초과합니다: ${file.name}`); return; }
    }

    setError(null);
    setCodefSource(false);
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

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setResult(null);
    setError(null);

    const usedFile = inputMode === "file" && fileName;
    const usedCodef = codefSource && rawText;

    if (usedCodef) { setStep("codef-fetch"); await new Promise((r) => setTimeout(r, 400)); }
    else if (usedFile) { setStep("extracting"); await new Promise((r) => setTimeout(r, 400)); }
    setStep("parsing"); await new Promise((r) => setTimeout(r, 600));
    setStep("validating"); await new Promise((r) => setTimeout(r, 400));
    setStep("scoring"); await new Promise((r) => setTimeout(r, 400));
    setStep("molit"); await new Promise((r) => setTimeout(r, 300));
    setStep("ai");

    try {
      const res = await fetch("/api/analyze-unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, estimatedPrice, source: codefSource ? "codef" : "manual" }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
      setStep("done");

      addAnalysis({
        type: "rights", typeLabel: "권리분석",
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

      const addr = data.parsed?.title?.address || (fileName || "직접 입력");
      addNotification(`권리분석 완료: ${addr}`);
      setAnalysisId(`rights_${Date.now()}`);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.");
      setStep("idle");
    }
  };

  return {
    inputMode, setInputMode,
    rawText, setRawText,
    estimatedPrice, setEstimatedPrice,
    step, result, error, setError,
    fileName, fileType, isDragging, isExtracting,
    analysisId, previousAnalysis,
    codefAddress, setCodefAddress,
    codefFetching, codefSource, setCodefSource,
    fileInputRef,
    loadSample, handleAddressAnalyze,
    handleDrop, handleDragOver, handleDragLeave,
    handleFileChange, handleAnalyze,
  };
}
