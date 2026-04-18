"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface LoanResult {
  bankName: string;
  productName: string;
  isEligible: boolean;
  maxLoanAmount: number;
  estimatedRate: { min: number; max: number };
  ltv: number;
  dti: number;
  reasons: string[];
  requirements: string[];
}

export interface SimResponse {
  results: LoanResult[];
  bestOption: { bankName: string; productName: string; reason: string } | null;
  summary: { eligibleCount: number; maxAvailable: number; lowestRate: number };
  disclaimer: string;
}

export interface LoanForm {
  deposit: number;
  propertyPrice: number;
  propertyType: string;
  propertyAddress: string;
  annualIncome: number;
  creditScore: number;
  existingLoans: number;
  isFirstHome: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useLoanCheckData() {
  const [form, setForm] = useState<LoanForm>({
    deposit: 300_000_000,
    propertyPrice: 500_000_000,
    propertyType: "아파트",
    propertyAddress: "",
    annualIncome: 50_000_000,
    creditScore: 700,
    existingLoans: 0,
    isFirstHome: false,
  });
  const [result, setResult] = useState<SimResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const update = <K extends keyof LoanForm>(key: K, value: LoanForm[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/loan/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || `서버 오류 (${res.status})`);
        return;
      }
      setResult(await res.json());
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const toggleBank = (key: string) =>
    setSelectedBank((prev) => (prev === key ? null : key));

  return {
    form,
    update,
    result,
    loading,
    error,
    selectedBank,
    toggleBank,
    handleSubmit,
  };
}
