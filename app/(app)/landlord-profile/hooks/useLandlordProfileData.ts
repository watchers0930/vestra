"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface LandlordProperty {
  address: string;
  mortgageTotal: number;
  liensTotal: number;
  estimatedPrice: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface LandlordProfile {
  nameDisplay: string;
  properties: LandlordProperty[];
  propertyCount: number;
  totalMortgage: number;
  totalLiens: number;
  totalEstimatedValue: number;
  mortgageRatio: number;
  safetyGrade: string;
  gradeScore: number;
  courtCaseCount: number;
  fraudCaseCount: number;
  riskFactors: string[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useLandlordProfileData() {
  const [inputName, setInputName] = useState("");
  const [inputAddress, setInputAddress] = useState("");
  const [profile, setProfile] = useState<LandlordProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  const handleSearch = async () => {
    if (!inputName.trim()) return;

    setLoading(true);
    setError("");
    setProfile(null);

    try {
      const res = await fetch("/api/landlord/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: inputName.trim(),
          baseAddress: inputAddress.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "조회에 실패했습니다.");
      }

      const data = await res.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return {
    inputName,
    setInputName,
    inputAddress,
    setInputAddress,
    profile,
    loading,
    error,
    reportOpen,
    setReportOpen,
    handleSearch,
  };
}
