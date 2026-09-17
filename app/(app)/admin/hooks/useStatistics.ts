"use client";

import { useState, useEffect, useCallback } from "react";
import type { Ga4Dashboard, Ga4Period } from "@/lib/ga4-reports";

export function useStatistics() {
  const [period, setPeriod] = useState<Ga4Period>(28);
  const [data, setData] = useState<Ga4Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/statistics?days=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "통계 조회에 실패했습니다");
      setData(json as Ga4Dashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : "통계 조회에 실패했습니다");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return { period, setPeriod, data, loading, error, reload: load };
}
