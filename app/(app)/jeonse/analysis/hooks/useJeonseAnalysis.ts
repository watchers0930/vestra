"use client";

import { useState, useRef, useEffect } from "react";
import { addAnalysis } from "@/lib/store";
import { addNotification } from "@/lib/notification-client";
import { checkGuaranteeInsurance } from "@/lib/guarantee-insurance";
import { useToast } from "@/components/common/toast";
import type { FraudRiskResult } from "@/lib/patent-types";
import type { GuaranteeInsuranceResult } from "@/lib/guarantee-insurance";
import type { JeonseFormData, JeonseAnalysis, GeneratedDocument } from "../types";

const DEFAULT_FORM: JeonseFormData = {
  landlordName: "",
  tenantName: "",
  propertyAddress: "",
  deposit: 300000000,
  monthlyRent: 0,
  startDate: "2025-03-01",
  endDate: "2027-02-28",
  propertyType: "아파트",
  propertyPrice: 500000000,
  seniorLiens: 0,
  isMetro: true,
  hasJeonseLoan: false,
};

export function useJeonseAnalysis() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<JeonseFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<JeonseAnalysis | null>(null);
  const [fraudRisk, setFraudRisk] = useState<FraudRiskResult | null>(null);
  const [fraudLoading, setFraudLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
  const [activeDocType, setActiveDocType] = useState<"jeonse" | "lease">("jeonse");
  const [guaranteeResult, setGuaranteeResult] = useState<GuaranteeInsuranceResult | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const resultRef = useRef<HTMLDivElement>(null);

  // localStorage 주소 프리필
  useEffect(() => {
    const lastAddr = localStorage.getItem("vestra_last_address");
    if (lastAddr) {
      setFormData((prev) => ({ ...prev, propertyAddress: lastAddr }));
      localStorage.removeItem("vestra_last_address");
    }
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);
    setFraudRisk(null);
    setGuaranteeResult(null);

    try {
      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "analyze", ...formData }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data);

      // 전세사기 위험도 병렬 분석
      setFraudLoading(true);
      fetch("/api/fraud-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jeonseRatio: Math.min(100, (formData.deposit / (formData.deposit * 1.25)) * 100),
          isBrokerRegistered: true,
          hasDepositInsurance: false,
        }),
      })
        .then((r) => r.json())
        .then((fr) => { if (!fr.error) setFraudRisk(fr); })
        .catch(() => showToast("전세사기 위험도 분석에 실패했습니다."))
        .finally(() => setFraudLoading(false));

      // 보증보험 가입 가능성 (클라이언트 즉시 계산)
      const gResult = checkGuaranteeInsurance({
        deposit: formData.deposit,
        propertyPrice: formData.propertyPrice,
        seniorLiens: formData.seniorLiens,
        propertyType: formData.propertyType,
        isMetro: formData.isMetro,
        contractStartDate: formData.startDate,
        contractEndDate: formData.endDate,
        hasJeonseLoan: formData.hasJeonseLoan,
      });
      setGuaranteeResult(gResult);

      addAnalysis({
        type: "jeonse",
        typeLabel: "전세보호",
        address: formData.propertyAddress || "미입력",
        summary: `전세권 ${data.needsRegistration === "required" ? "설정 필수" : data.needsRegistration === "recommended" ? "설정 권고" : "선택 사항"}, 위험도 ${data.riskLevel}`,
        data: data as unknown as Record<string, unknown>,
      });

      addNotification("전세 안전 분석 완료");
    } catch {
      showToast("분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDoc = async (docType: "jeonse" | "lease") => {
    setDocLoading(true);
    setActiveDocType(docType);
    setGeneratedDoc(null);

    try {
      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: docType, ...formData }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedDoc(data);
    } catch {
      showToast("문서 생성 중 오류가 발생했습니다.");
    } finally {
      setDocLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("클립보드에 복사되었습니다.", "success");
  };

  return {
    formData, setFormData,
    loading, analysis,
    fraudRisk, fraudLoading,
    docLoading, generatedDoc,
    activeDocType,
    guaranteeResult,
    checklist, setChecklist,
    resultRef,
    handleAnalyze, handleGenerateDoc, copyToClipboard,
  };
}
