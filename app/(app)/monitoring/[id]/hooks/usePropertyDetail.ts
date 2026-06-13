"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { ChainVerificationResult } from "@/lib/registry-blockchain";

export interface PropertyDetail {
  id: string;
  address: string;
  status: string;
  monitorMode: string;
  deposit: number | null;
  contractDate: string | null;
  moveInDate: string | null;
  lastCheckedAt: string | null;
  commUniqueNo: string | null;
  ownerName: string | null;
  createdAt: string;
  snapshotCount: number;
  alerts: AlertItem[];
}

export interface AlertItem {
  id: string;
  changeType: string;
  summary: string;
  detail: string | null;
  riskLevel: string;
  isRead: boolean;
  createdAt: string;
}

export interface SnapshotItem {
  id: string;
  sequenceNo: number;
  merkleRoot: string;
  snapshotHash: string;
  previousSnapshotHash: string | null;
  signature: string;
  sectionHashes: { section: string; hash: string }[];
  timestamp: string;
}

export interface IntegrityResult extends ChainVerificationResult {
  publicKey?: string;
}

export function usePropertyDetail(propertyId: string) {
  const { data: session } = useSession();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [monitorDays, setMonitorDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [integrityResult, setIntegrityResult] = useState<IntegrityResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    async function load() {
      if (!session?.user || !propertyId) {
        setLoading(false);
        return;
      }

      try {
        const [propRes, snapRes] = await Promise.all([
          fetch(`/api/monitoring/${propertyId}`),
          fetch(`/api/monitoring/snapshots?propertyId=${propertyId}`),
        ]);

        if (propRes.ok) {
          const propData = await propRes.json();
          setProperty(propData.property);
          if (propData.property?.createdAt) {
            setMonitorDays(Math.floor((Date.now() - new Date(propData.property.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
          }
        }
        if (snapRes.ok) {
          const snapData = await snapRes.json();
          setSnapshots(snapData.snapshots || []);
        }
      } catch {
        /* 조회 실패 무시 */
      }

      setLoading(false);
    }
    load();
  }, [session, propertyId]);

  const verifyIntegrity = useCallback(async () => {
    if (!propertyId) return;
    setVerifying(true);
    try {
      const res = await fetch(
        `/api/monitoring/integrity?propertyId=${propertyId}&includePublicKey=true`
      );
      if (res.ok) {
        const data = await res.json();
        setIntegrityResult(data);
      }
    } catch {
      /* 검증 실패 */
    } finally {
      setVerifying(false);
    }
  }, [propertyId]);

  const deleteProperty = useCallback(async (): Promise<boolean> => {
    if (!propertyId) return false;
    try {
      const res = await fetch(`/api/monitoring/${propertyId}`, { method: "DELETE" });
      return res.ok;
    } catch {
      return false;
    }
  }, [propertyId]);

  const markAlertRead = useCallback(async (alertId: string) => {
    try {
      await fetch(`/api/monitoring/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setProperty((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: prev.alerts.map((a) =>
            a.id === alertId ? { ...a, isRead: true } : a
          ),
        };
      });
    } catch {
      /* 실패 무시 */
    }
  }, []);

  return {
    property,
    snapshots,
    monitorDays,
    loading,
    integrityResult,
    verifying,
    verifyIntegrity,
    markAlertRead,
    deleteProperty,
  };
}
