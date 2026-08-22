"use client";

import { useState, useEffect } from "react";

export type ContractType = "JEONSE" | "MONTHLY" | "SALE";
export type Step = "type" | "info" | "parties" | "confirm" | "done";

/** 가계약서 당사자(임대인/임차인) */
export interface Party {
  name: string;
  phone: string;
  rrn: string;   // 생년월일+성별 1자리 (예: "890101-1")
  sign: string;  // 손글씨 서명 PNG data URL
}

export interface ProvisionalContractState {
  contractType: ContractType;
  address: string;
  deposit: string;      // 보증금/매매가
  monthlyRent: string;  // 월세 (MONTHLY만)
  contractDate: string; // 계약일
  startDate: string;    // 입주/시작일
  endDate: string;      // 만료일 (전세/월세)
  balance: string;      // 잔금
  balanceDate: string;  // 잔금 지급일
  specialTerms: string; // 특약 (표준계약서 요약)
  landlord: Party;
  tenant: Party;
}

const EMPTY_PARTY: Party = { name: "", phone: "", rrn: "", sign: "" };

const INITIAL: ProvisionalContractState = {
  contractType: "JEONSE",
  address: "",
  deposit: "",
  monthlyRent: "",
  contractDate: "",
  startDate: "",
  endDate: "",
  balance: "",
  balanceDate: "",
  specialTerms: "",
  landlord: { ...EMPTY_PARTY },
  tenant: { ...EMPTY_PARTY },
};

const RRN_RE = /^\d{6}-[1-4]$/;

export function useContractForm() {
  const [step, setStep] = useState<Step>("type");
  const [form, setForm] = useState<ProvisionalContractState>(INITIAL);
  const [applicationId, setApplicationId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 받은 의향서(수락)에서 진입 시 매물·금액 프리필 + 의향서 연결
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const appId = sp.get("applicationId");
    if (!appId) return;
    setApplicationId(appId);
    const address = sp.get("address") ?? "";
    const deposit = sp.get("deposit") ?? "";
    const type = sp.get("type") ?? "";
    setForm((prev) => ({
      ...prev,
      ...(address ? { address } : {}),
      ...(deposit ? { deposit } : {}),
      ...(["JEONSE", "MONTHLY", "SALE"].includes(type) ? { contractType: type as ContractType } : {}),
    }));
    setStep("info");
  }, []);

  function update<K extends keyof ProvisionalContractState>(key: K, value: ProvisionalContractState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function updateParty(who: "landlord" | "tenant", key: keyof Party, value: string) {
    setForm((prev) => ({ ...prev, [who]: { ...prev[who], [key]: value } }));
    setError(null);
  }

  function appendSpecialTerm(term: string) {
    setForm((prev) => ({ ...prev, specialTerms: prev.specialTerms ? `${prev.specialTerms}\n${term}` : term }));
  }

  /** 당사자 필수값 검증 */
  function validateParties(): string | null {
    for (const [label, party] of [["임대인", form.landlord], ["임차인", form.tenant]] as const) {
      if (!party.name.trim()) return `${label} 이름을 입력해주세요.`;
      if (!/^\d{2,3}-?\d{3,4}-?\d{4}$/.test(party.phone.replace(/\s/g, ""))) return `${label} 전화번호를 확인해주세요.`;
      if (!RRN_RE.test(party.rrn)) return `${label} 생년월일+성별을 확인해주세요. (예: 890101-1)`;
      if (!party.sign) return `${label} 서명을 입력해주세요.`;
    }
    return null;
  }

  async function submit() {
    setError(null);
    const depositVal = parseInt(form.deposit.replace(/,/g, ""), 10);
    if (!depositVal || isNaN(depositVal)) { setError("금액을 올바르게 입력해주세요."); return; }
    const partyErr = validateParties();
    if (partyErr) { setError(partyErr); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/e-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractType: form.contractType,
          address: form.address,
          deposit: depositVal,
          monthlyRent: form.monthlyRent ? parseInt(form.monthlyRent.replace(/,/g, ""), 10) : null,
          contractDate: form.contractDate || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          balance: form.balance ? parseInt(form.balance.replace(/,/g, ""), 10) : null,
          balanceDate: form.balanceDate || null,
          specialTerms: form.specialTerms || null,
          landlord: form.landlord,
          tenant: form.tenant,
          ...(applicationId ? { applicationId } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setError(json.error ?? "가계약서 생성에 실패했습니다."); return; }
      setPdfUrl(json.pdfUrl ?? `/api/e-contracts/${json.id}/pdf`);
      setStep("done");
    } catch {
      setError("서버 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return { step, setStep, form, update, updateParty, appendSpecialTerm, submit, submitting, pdfUrl, error };
}
