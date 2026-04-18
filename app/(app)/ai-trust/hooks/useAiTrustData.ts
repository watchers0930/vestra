"use client";

import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ModelAccuracy {
  id: string;
  name: string;
  accuracy: number;
  totalAnalyses: number;
  expertAgreementRate: number;
  lastUpdated: string;
  description: string;
  dataSources: string[];
}

export interface MonthlyTrend {
  month: string;
  jeonse: number;
  rights: number;
  prediction: number;
  contract: number;
}

export interface TrustData {
  overview: {
    totalAnalyses: number;
    avgAccuracy: number;
    avgProcessingTime: number;
    lastVerificationDate: string;
    verificationCycle: string;
  };
  models: ModelAccuracy[];
  trends: MonthlyTrend[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAiTrustData() {
  const [data, setData] = useState<TrustData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai-trust")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleModel = (id: string) => {
    setExpandedModel((prev) => (prev === id ? null : id));
  };

  return { data, loading, expandedModel, toggleModel };
}
