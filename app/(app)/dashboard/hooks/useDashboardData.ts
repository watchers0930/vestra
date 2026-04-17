"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getAssets, getAnalyses, removeAnalysis, type StoredAsset, type AnalysisRecord } from "@/lib/store";
import { useToast } from "@/components/common/toast";

export function useDashboardData() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [assets, setAssets] = useState<StoredAsset[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cascadeLoading, setCascadeLoading] = useState<string | null>(null);
  const [monitoredCount, setMonitoredCount] = useState(0);
  const [monitoredAddresses, setMonitoredAddresses] = useState<Set<string>>(new Set());
  const [monitoringLoading, setMonitoringLoading] = useState<string | null>(null);
  const [monitoringSuccess, setMonitoringSuccess] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadData() {
      if (session?.user) {
        try {
          const res = await fetch("/api/user/sync-data");
          if (res.ok) {
            const data = await res.json();
            setAnalyses(data.analyses || []);
            setAssets(data.assets || []);
          } else {
            setAssets(getAssets());
            setAnalyses(getAnalyses());
          }
        } catch {
          setAssets(getAssets());
          setAnalyses(getAnalyses());
        }
        try {
          const monRes = await fetch("/api/monitoring");
          if (monRes.ok) {
            const monData = await monRes.json();
            setMonitoredCount(monData.total || 0);
            const addrs = new Set<string>(
              (monData.properties || []).map((p: { address: string }) => p.address)
            );
            setMonitoredAddresses(addrs);
          }
        } catch { /* 모니터링 조회 실패 무시 */ }
      } else {
        setAssets(getAssets());
        setAnalyses(getAnalyses());
      }
      setMounted(true);
      setLoading(false);
    }
    loadData();
  }, [session]);

  const totalAssets = assets.length;
  const totalValue = useMemo(() => assets.reduce((sum, a) => sum + a.estimatedPrice, 0), [assets]);
  const avgSafety = useMemo(
    () => assets.length > 0 ? Math.round(assets.reduce((sum, a) => sum + a.safetyScore, 0) / assets.length) : 0,
    [assets],
  );
  const avgRisk = useMemo(
    () => assets.length > 0 ? Math.round(assets.reduce((sum, a) => sum + a.riskScore, 0) / assets.length) : 0,
    [assets],
  );

  const riskDistribution = useMemo(() => {
    if (assets.length === 0) return [];
    const low = assets.filter((a) => a.riskScore <= 30).length;
    const mid = assets.filter((a) => a.riskScore > 30 && a.riskScore <= 60).length;
    const high = assets.filter((a) => a.riskScore > 60).length;
    return [
      { name: "저위험 (0-30)", value: low, fill: "#34d399" },
      { name: "중위험 (31-60)", value: mid, fill: "#fbbf24" },
      { name: "고위험 (61+)", value: high, fill: "#f87171" },
    ].filter((d) => d.value > 0);
  }, [assets]);

  const assetValueData = useMemo(
    () => assets.slice(0, 8).map((a) => ({
      name: a.address.length > 12 ? a.address.slice(0, 12) + "..." : a.address,
      value: a.estimatedPrice,
      risk: a.riskScore,
    })),
    [assets],
  );

  const addressCountMap = useMemo(
    () => analyses.reduce<Record<string, number>>((acc, a) => { acc[a.address] = (acc[a.address] || 0) + 1; return acc; }, {}),
    [analyses],
  );

  const handleDeleteAnalysis = useCallback(async (id: string) => {
    removeAnalysis(id);
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    if (session?.user) {
      try {
        await fetch("/api/user/sync-data", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId: id }),
        });
      } catch { /* 실패해도 로컬은 이미 삭제됨 */ }
    }
  }, [session?.user]);

  const handleCascadeUpdate = async (address: string) => {
    setCascadeLoading(address);
    try {
      const res = await fetch("/api/cascade-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`캐스케이드 업데이트 완료: ${data.cascade.totalNodesAffected}개 노드 영향`, "success");
      } else {
        showToast(data.error || "캐스케이드 업데이트 실패", "error");
      }
    } catch {
      showToast("캐스케이드 업데이트 요청 중 오류가 발생했습니다.", "error");
    } finally {
      setCascadeLoading(null);
    }
  };

  const handleMonitorRegister = async (address: string) => {
    if (!session?.user) return;
    setMonitoringLoading(address);
    try {
      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (res.ok || res.status === 409) {
        setMonitoredAddresses((prev) => new Set(prev).add(address));
        setMonitoringSuccess((prev) => new Set(prev).add(address));
        if (res.ok) setMonitoredCount((prev) => prev + 1);
      }
    } catch { /* 실패 무시 */ } finally {
      setMonitoringLoading(null);
    }
  };

  return {
    session, assets, analyses, mounted, loading,
    cascadeLoading, monitoredCount, monitoredAddresses,
    monitoringLoading, monitoringSuccess,
    totalAssets, totalValue, avgSafety, avgRisk,
    riskDistribution, assetValueData, addressCountMap,
    handleDeleteAnalysis, handleCascadeUpdate, handleMonitorRegister,
  };
}
