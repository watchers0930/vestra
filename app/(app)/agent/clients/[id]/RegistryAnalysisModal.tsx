"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import type { UnifiedResult } from "@/components/rights/RightsResult";

const RightsResult = dynamic(
  () => import("@/components/rights/RightsResult").then((m) => m.RightsResult),
  {
    loading: () => (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ),
  }
);

type Step = "idle" | "fetching" | "analyzing" | "done" | "error";

const STEP_LABELS: Record<Step, string> = {
  idle: "",
  fetching: "주소 정보 조회 중...",
  analyzing: "AI 권리분석 중...",
  done: "",
  error: "",
};

interface Props {
  address: string;
  open: boolean;
  onClose: () => void;
}

export function RegistryAnalysisModal({ address, open, onClose }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<UnifiedResult | null>(null);
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState("");

  // 모달 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  useEffect(() => {
    if (!open || !address) return;
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, address]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      setStep("idle");
      setResult(null);
      setRawText("");
      setError("");
    }
  }, [open]);

  async function runAnalysis() {
    setStep("fetching");
    setError("");
    setResult(null);

    try {
      // 1단계: 건물·시세 정보 조회
      const geoRes = await fetch(
        `/api/analyze-unified?address=${encodeURIComponent(address)}`
      );
      const geoData = await geoRes.json();
      if (geoData.error) throw new Error(geoData.error);

      const b = geoData.building;
      const p = geoData.price;
      const lines: string[] = ["【 표 제 부 】", "", `소재지번: ${address}`];
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

      const autoPrice = p?.sale?.avgPrice || p?.rent?.avgDeposit || 850000000;

      // 2단계: AI 권리분석
      setStep("analyzing");
      const res = await fetch("/api/analyze-unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: syntheticText,
          estimatedPrice: autoPrice,
          source: "address",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setRawText(syntheticText);
      setResult(data as UnifiedResult);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석에 실패했습니다.");
      setStep("error");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden" style={{ maxHeight: "90vh" }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="text-base font-semibold text-[#1d1d1f]">등기부 분석</h2>
            <p className="text-xs text-[#86868b] truncate">{address}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {step === "error" && (
              <button
                onClick={runAnalysis}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                <RotateCcw size={12} />
                재시도
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors"
            >
              <X size={18} className="text-[#86868b]" />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(90vh - 73px)" }}>
          {(step === "fetching" || step === "analyzing") && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-[#6e6e73]">{STEP_LABELS[step]}</p>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center py-16 gap-3">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {step === "done" && result && (
            <RightsResult result={result} rawText={rawText} />
          )}
        </div>
      </div>
    </div>
  );
}
