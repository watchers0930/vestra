"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface DecisionSummary {
  overallGrade: string;
  recommendation: string;
  keyPoints: string[];
  loanEligible: number;
  maxLoanAmount: number;
  lowestRate: number;
}

export interface LoanResult {
  bankName: string;
  productName: string;
  isEligible: boolean;
  maxLoanAmount: number;
  estimatedRate: { min: number; max: number };
}

export interface ReportData {
  summary: DecisionSummary;
  loanSimulation: {
    results: LoanResult[];
    bestOption: { bankName: string; productName: string; reason: string } | null;
  };
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Hook (must be used inside a Suspense boundary due to useSearchParams)
// ---------------------------------------------------------------------------
export function useDecisionReportData() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async (input: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/decision-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (res.ok) setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const deposit = searchParams.get("deposit");
    const propertyPrice = searchParams.get("propertyPrice");
    const annualIncome = searchParams.get("annualIncome");

    if (deposit && propertyPrice && annualIncome) {
      generateReport({
        address: searchParams.get("address") || "서울특별시",
        deposit: Number(deposit),
        propertyPrice: Number(propertyPrice),
        propertyType: searchParams.get("propertyType") || "아파트",
        annualIncome: Number(annualIncome),
        isFirstHome: searchParams.get("isFirstHome") === "true",
        transactionType: "JEONSE",
      });
    }
  }, [searchParams]);

  return { report, loading, generateReport };
}
