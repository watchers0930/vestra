"use client";

import { useState, useRef, useEffect } from "react";
import { addAnalysis } from "@/lib/store";
import { addNotification } from "@/lib/notification-client";
import { checkGuaranteeInsurance } from "@/lib/guarantee-insurance";
import { useToast } from "@/components/common/toast";
import type { FraudRiskResult } from "@/lib/patent-types";
import type { GuaranteeInsuranceResult, GuaranteeRules } from "@/lib/guarantee-insurance";
import type { KaptInfoData } from "@/components/common/KaptInfoCard";
import type { JeonseFormData, JeonseAnalysis, GeneratedDocument } from "../types";

const DEFAULT_FORM: JeonseFormData = {
  propertyAddress: "",
  dongHo: "",
  dong: "",
  ho: "",
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
  const [kaptInfo, setKaptInfo] = useState<KaptInfoData | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [registryLoading, setRegistryLoading] = useState(false);
  const [parsedOwner, setParsedOwner] = useState("");
  const [parsedPropUid, setParsedPropUid] = useState("");
  const [registrySummary, setRegistrySummary] = useState<Record<string, unknown> | null>(null);
  // 등기부 파싱 후 근저당 자동반영 결과 (화면 피드백용)
  const [registryParse, setRegistryParse] = useState<{
    mortgageActiveCount: number;
    mortgageCancelledCount: number;
    totalMortgage: number;
    ocrUsed: boolean;
  } | null>(null);
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
    setKaptInfo(null);

    try {
      // K-apt 단지정보 병렬 조회 (실패 무시)
      if (formData.propertyAddress) {
        fetch(`/api/kapt?address=${encodeURIComponent(formData.propertyAddress)}`)
          .then((r) => r.json())
          .then((d) => { if (!d.error) setKaptInfo(d); })
          .catch(() => {});
      }

      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "analyze", ...formData, registrySummary, landlordName: parsedOwner || undefined }),
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
          jeonseRatio: formData.propertyPrice > 0
            ? Math.min(100, (formData.deposit / formData.propertyPrice) * 100)
            : 50,
          mortgageRatio: formData.propertyPrice > 0
            ? Math.min(100, (formData.seniorLiens / formData.propertyPrice) * 100)
            : 0,
          ...(registrySummary && {
            seizureCount: registrySummary.hasSeizure ? 1 : 0,
            provisionalSeizureCount: registrySummary.hasProvisionalSeizure ? 1 : 0,
          }),
          isBrokerRegistered: true,
          hasDepositInsurance: false,
        }),
      })
        .then((r) => r.json())
        .then((fr) => { if (!fr.error) setFraudRisk(fr); })
        .catch(() => showToast("전세사기 위험도 분석에 실패했습니다."))
        .finally(() => setFraudLoading(false));

      // 보증보험 활성 규칙 로드 (어드민 규칙 반영). 실패 시 undefined → 계산 함수의 기본값 사용
      let gRules: GuaranteeRules | undefined;
      try {
        const rr = await fetch("/api/guarantee-rules");
        if (rr.ok) gRules = (await rr.json()).rules as GuaranteeRules;
      } catch {
        // 규칙 로드 실패 시 기본값으로 계산 (계산 자체는 막지 않음)
      }

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
      }, gRules);
      setGuaranteeResult(gResult);

      addAnalysis({
        type: "jeonse",
        typeLabel: "전세보호",
        address: [formData.propertyAddress, [formData.dong, formData.ho].filter(Boolean).join(" ") || formData.dongHo].filter(Boolean).join(" ") || "미입력",
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
        body: JSON.stringify({ type: docType, ...formData, landlordName: parsedOwner || undefined }),
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

  const handleRegistryUpload = async (file: File) => {
    setRegistryLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/jeonse/parse-registry", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.address) setFormData((prev) => ({ ...prev, propertyAddress: data.address }));
      if (typeof data.totalMortgage === "number" && data.totalMortgage > 0) {
        setFormData((prev) => ({ ...prev, seniorLiens: data.totalMortgage }));
      }
      if (data.ownerName) setParsedOwner(data.ownerName);
      if (data.propUid) setParsedPropUid(data.propUid);
      if (data.registrySummary) setRegistrySummary(data.registrySummary);
      setRegistryParse({
        mortgageActiveCount: data.mortgageActiveCount ?? 0,
        mortgageCancelledCount: data.mortgageCancelledCount ?? 0,
        totalMortgage: data.totalMortgage ?? 0,
        ocrUsed: !!data.ocrUsed,
      });
      const activeCnt = data.mortgageActiveCount ?? 0;
      showToast(
        activeCnt > 0
          ? `근저당 ${activeCnt}건을 선순위채권으로 자동 반영했습니다.`
          : "등기부 분석 완료 — 활성 근저당이 없어 선순위채권 0원으로 반영했습니다.",
        "success"
      );
    } catch {
      showToast("등기부등본 파싱에 실패했습니다. 등기부 원본(PDF·선명한 이미지)인지 확인해 주세요.");
    } finally {
      setRegistryLoading(false);
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
    kaptInfo,
    checklist, setChecklist,
    registryLoading, parsedOwner, parsedPropUid, registryParse,
    resultRef,
    handleAnalyze, handleGenerateDoc, handleRegistryUpload, copyToClipboard,
  };
}
