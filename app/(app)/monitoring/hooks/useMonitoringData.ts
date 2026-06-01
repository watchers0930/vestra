"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";

export interface MonitoredProperty {
  id: string;
  address: string;
  status: string;
  monitorMode: string;
  deposit: number | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AlertSummary {
  monitoredPropertyId: string;
  riskLevel: string;
  isRead: boolean;
}

export type StatusFilter = "all" | "active" | "paused";

export function useMonitoringData() {
  const { data: session } = useSession();
  const [properties, setProperties] = useState<MonitoredProperty[]>([]);
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    async function load() {
      if (!session?.user) {
        setMounted(true);
        setLoading(false);
        return;
      }

      try {
        const [propRes, alertRes] = await Promise.all([
          fetch("/api/monitoring"),
          fetch("/api/monitoring/alerts?page=1"),
        ]);

        if (propRes.ok) {
          const propData = await propRes.json();
          setProperties(propData.properties || []);
        }
        if (alertRes.ok) {
          const alertData = await alertRes.json();
          setAlerts(
            (alertData.alerts || []).map((a: AlertSummary & { monitoredPropertyId: string }) => ({
              monitoredPropertyId: a.monitoredPropertyId,
              riskLevel: a.riskLevel,
              isRead: a.isRead,
            }))
          );
        }
      } catch {
        /* 조회 실패 무시 */
      }

      setMounted(true);
      setLoading(false);
    }
    load();
  }, [session]);

  // KPI 계산
  const activeCount = useMemo(
    () => properties.filter((p) => p.status === "active").length,
    [properties]
  );

  const unreadAlertCount = useMemo(
    () => alerts.filter((a) => !a.isRead).length,
    [alerts]
  );

  const highRiskCount = useMemo(
    () => alerts.filter((a) => !a.isRead && (a.riskLevel === "critical" || a.riskLevel === "high")).length,
    [alerts]
  );

  // 물건별 미확인 알림 수
  const unreadByProperty = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of alerts) {
      if (!a.isRead) {
        map[a.monitoredPropertyId] = (map[a.monitoredPropertyId] || 0) + 1;
      }
    }
    return map;
  }, [alerts]);

  // 물건별 최고 위험도
  const highestRiskByProperty = useMemo(() => {
    const levels: Record<string, string> = { critical: "4", high: "3", medium: "2", low: "1" };
    const map: Record<string, string> = {};
    for (const a of alerts) {
      if (!a.isRead) {
        const cur = levels[map[a.monitoredPropertyId] || ""] || "0";
        const next = levels[a.riskLevel] || "0";
        if (next > cur) map[a.monitoredPropertyId] = a.riskLevel;
      }
    }
    return map;
  }, [alerts]);

  // 필터링된 물건 목록
  const filteredProperties = useMemo(() => {
    if (statusFilter === "all") return properties;
    return properties.filter((p) => p.status === statusFilter);
  }, [properties, statusFilter]);

  return {
    session,
    properties,
    filteredProperties,
    loading,
    mounted,
    statusFilter,
    setStatusFilter,
    activeCount,
    unreadAlertCount,
    highRiskCount,
    unreadByProperty,
    highestRiskByProperty,
  };
}
