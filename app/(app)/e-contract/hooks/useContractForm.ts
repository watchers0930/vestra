"use client";

import { useState } from "react";

export type ContractType = "JEONSE" | "MONTHLY" | "SALE";
export type Step = "type" | "basic" | "terms" | "confirm" | "done";

export interface ContractFormState {
  contractType: ContractType;
  address: string;
  deposit: string;
  monthlyRent: string;
  duration: string;
  startDate: string;
  endDate: string;
  tenantEmail: string;
  brokerEmail: string;
  specialTerms: string;
}

const INITIAL: ContractFormState = {
  contractType: "JEONSE",
  address: "",
  deposit: "",
  monthlyRent: "",
  duration: "24",
  startDate: "",
  endDate: "",
  tenantEmail: "",
  brokerEmail: "",
  specialTerms: "",
};

export function useContractForm() {
  const [step, setStep] = useState<Step>("type");
  const [form, setForm] = useState<ContractFormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof ContractFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function appendSpecialTerm(term: string) {
    setForm((prev) => ({
      ...prev,
      specialTerms: prev.specialTerms
        ? `${prev.specialTerms}\n${term}`
        : term,
    }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const depositVal = parseInt(form.deposit.replace(/,/g, ""), 10);
      const monthlyVal = form.monthlyRent
        ? parseInt(form.monthlyRent.replace(/,/g, ""), 10)
        : null;

      if (!depositVal || isNaN(depositVal)) {
        setError("보증금을 올바르게 입력해주세요.");
        return;
      }

      const res = await fetch("/api/e-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractType: form.contractType,
          address: form.address,
          deposit: depositVal,
          monthlyRent: monthlyVal,
          duration: form.duration ? parseInt(form.duration) : null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          specialTerms: form.specialTerms || null,
          tenantEmail: form.tenantEmail,
          brokerEmail: form.brokerEmail || null,
        }),
      });

      const json = await res.json();
      if (json.error) {
        setError(json.error);
        return;
      }

      setSignUrl(json.signUrl);
      setStep("done");
    } catch {
      setError("서버 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return { step, setStep, form, update, appendSpecialTerm, submit, submitting, signUrl, error };
}
