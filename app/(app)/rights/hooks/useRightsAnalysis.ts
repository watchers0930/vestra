"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { addAnalysis, addOrUpdateAsset, getLatestAnalysisForAddress } from "@/lib/store";
import { addNotification } from "@/lib/notification-client";
import { SAMPLE_REGISTRY_TEXT } from "@/lib/registry-parser";
import type { UnifiedResult } from "@/components/rights/RightsResult";
import type { InputMode, AnalysisStep } from "../types";

export interface IssuedRegistryAnalysisPayload {
  order?: {
    orderId?: string;
    status?: string;
  };
  registry: {
    text: string;
    address?: string;
  };
  analysis: {
    id?: string;
    result: UnifiedResult;
  };
}

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
  const [tilkoAddress, setTilkoAddress] = useState("");
  const [tilkoFetching, setTilkoFetching] = useState(false);
  const [tilkoSource, setTilkoSource] = useState(false);
  const [autoAddress, setAutoAddress] = useState<string | null>(null);

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

    // URL ?address= 파라미터 감지 → 주소 자동 조회 모드로 전환
    const params = new URLSearchParams(window.location.search);
    const urlAddr = params.get("address");
    if (urlAddr) {
      setInputMode("tilko");
      setTilkoAddress(urlAddr);
      setAutoAddress(urlAddr);
    }
  }, []);

  const loadSample = () => {
    setRawText(SAMPLE_REGISTRY_TEXT);
    setFileName(null);
    setFileType(null);
    setTilkoSource(false);
    setInputMode("text");
  };

  const handleAddressAnalyze = async (addrOverride?: string) => {
    const addr = (addrOverride ?? tilkoAddress).trim();
    if (!addr || addr.length < 4) return;
    setTilkoFetching(true);
    setError(null);
    setResult(null);

    try {
      setStep("tilko-fetch");

      // 1. 틸코 등기부등본 + 시세 데이터 병렬 조회
      const [tilkoRes, geoRes] = await Promise.allSettled([
        fetch("/api/tilko/registry-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: addr }),
        }),
        fetch(`/api/analyze-unified?address=${encodeURIComponent(addr)}`),
      ]);

      // 시세 데이터 파싱 (실패해도 계속 진행)
      let geoData: {
        building?: {
          buildingName?: string;
          totalArea?: number | string;
          mainPurpose?: string;
          structure?: string;
          buildYear?: number | string;
        };
        price?: {
          sale?: {
            avgPrice: number;
            period?: string;
            transactionCount?: number;
          };
          rent?: {
            avgDeposit: number;
          };
          jeonseRatio?: number;
        };
      } | null = null;
      let autoPrice = 0;
      if (geoRes.status === "fulfilled" && geoRes.value.ok) {
        geoData = await geoRes.value.json().catch(() => null);
        const p = geoData?.price;
        if (p?.sale?.avgPrice) autoPrice = p.sale.avgPrice;
        else if (p?.rent?.avgDeposit) autoPrice = p.rent.avgDeposit;
      }
      if (autoPrice > 0) setEstimatedPrice(autoPrice);
      const priceForAnalysis = autoPrice > 0 ? autoPrice : estimatedPrice;

      // 2. 틸코 성공 시 실 등기부 텍스트, 실패 시 간이 텍스트 폴백
      let registryText: string;
      let registrySource: "tilko" | "synthetic";

      if (tilkoRes.status === "fulfilled" && tilkoRes.value.ok) {
        const tilkoData = await tilkoRes.value.json();
        if (tilkoData.text && !tilkoData.error) {
          registryText = tilkoData.text;
          registrySource = "tilko";
        } else {
          throw new Error(tilkoData.error || "틸코 등기부 응답 오류");
        }
      } else {
        // 폴백: 공공데이터 기반 간이 텍스트
        console.warn("[권리분석] 틸코 조회 실패, 간이분석으로 폴백");
        const b = geoData?.building;
        const p = geoData?.price;
        const lines: string[] = ["【 표 제 부 】", "", `소재지번: ${addr}`];
        if (b?.buildingName) lines.push(`건물명칭: ${b.buildingName}`);
        if (b?.totalArea) lines.push(`연면적: ${b.totalArea}㎡`);
        if (b?.mainPurpose) lines.push(`주용도: ${b.mainPurpose}`);
        if (b?.structure) lines.push(`구조: ${b.structure}`);
        if (b?.buildYear) lines.push(`건축년도: ${b.buildYear}년`);
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
        registryText = lines.join("\n");
        registrySource = "synthetic";
      }

      setTilkoSource(true);
      setFileName(null);
      setFileType(null);

      await new Promise((r) => setTimeout(r, 300));
      setStep("parsing"); await new Promise((r) => setTimeout(r, 500));
      setStep("validating"); await new Promise((r) => setTimeout(r, 400));
      setStep("scoring"); await new Promise((r) => setTimeout(r, 400));
      setStep("molit"); await new Promise((r) => setTimeout(r, 300));
      setStep("ai");

      const res = await fetch("/api/analyze-unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: registryText,
          estimatedPrice: priceForAnalysis,
          source: registrySource === "tilko" ? "tilko" : "address",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setRawText(registryText);
      setResult(data);
      setStep("done");

      const summaryLabel = registrySource === "tilko" ? "틸코 등기부" : "간이분석";
      addAnalysis({
        type: "rights", typeLabel: "권리분석", address: addr,
        summary: `${data.riskScore?.grade || "?"}등급 (${data.riskScore?.gradeLabel || ""}, ${data.riskScore?.totalScore || 0}점) | ${summaryLabel}`,
        data: data as unknown as Record<string, unknown>,
      });
      addOrUpdateAsset({
        address: addr,
        type: data.propertyInfo?.type || "부동산",
        estimatedPrice: priceForAnalysis || data.propertyInfo?.estimatedPrice || 0,
        jeonsePrice: data.propertyInfo?.jeonsePrice || 0,
        safetyScore: data.riskAnalysis?.safetyScore || 0,
        riskScore: data.riskAnalysis?.riskScore || 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석에 실패했습니다.");
      setStep("idle");
    } finally {
      setTilkoFetching(false);
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
    setTilkoSource(false);
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
    const usedTilko = tilkoSource && rawText;

    if (usedTilko) { setStep("tilko-fetch"); await new Promise((r) => setTimeout(r, 400)); }
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
        body: JSON.stringify({ rawText, estimatedPrice, source: tilkoSource ? "tilko" : "manual" }),
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

  const applyIssuedRegistryAnalysis = useCallback((payload: IssuedRegistryAnalysisPayload) => {
    const data = payload.analysis.result;
    const issuedText = payload.registry.text;
    const addr =
      data.propertyInfo?.address ||
      data.parsed?.title?.address ||
      payload.registry.address ||
      "틸코 등기부";

    setRawText(issuedText);
    setResult(data);
    setError(null);
    setStep("done");
    setTilkoSource(true);
    setFileName(null);
    setFileType(null);
    setAnalysisId(payload.analysis.id || `rights_${Date.now()}`);

    if (data.propertyInfo?.estimatedPrice) {
      setEstimatedPrice(data.propertyInfo.estimatedPrice);
    }

    addAnalysis({
      type: "rights",
      typeLabel: "권리분석",
      address: addr,
      summary: `${data.riskScore?.grade || "?"}등급 (${data.riskScore?.gradeLabel || ""}, ${data.riskScore?.totalScore || 0}점) | 틸코 등기부 발급`,
      data: data as unknown as Record<string, unknown>,
    });
    addOrUpdateAsset({
      address: data.propertyInfo?.address || addr,
      type: data.propertyInfo?.type || "부동산",
      estimatedPrice: data.propertyInfo?.estimatedPrice || 0,
      jeonsePrice: data.propertyInfo?.jeonsePrice || 0,
      safetyScore: data.riskAnalysis?.safetyScore || 0,
      riskScore: data.riskAnalysis?.riskScore || 0,
    });
    addNotification(`틸코 등기부 발급 및 권리분석 완료: ${addr}`);
  }, []);

  // autoAddress 세팅 시 자동 분석 실행 (handleAddressAnalyze 정의 이후에 선언)
  useEffect(() => {
    if (!autoAddress) return;
    setAutoAddress(null);
    handleAddressAnalyze(autoAddress);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAddress]);

  return {
    inputMode, setInputMode,
    rawText, setRawText,
    estimatedPrice, setEstimatedPrice,
    step, result, error, setError,
    fileName, fileType, isDragging, isExtracting,
    analysisId, previousAnalysis,
    tilkoAddress, setTilkoAddress,
    tilkoFetching, tilkoSource, setTilkoSource,
    fileInputRef,
    loadSample, handleAddressAnalyze,
    handleDrop, handleDragOver, handleDragLeave,
    handleFileChange, handleAnalyze, applyIssuedRegistryAnalysis,
  };
}
