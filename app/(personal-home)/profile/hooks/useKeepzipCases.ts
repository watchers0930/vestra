"use client";

import { useState, useEffect, useCallback } from "react";

export interface KzListItem {
  id: string;
  cause: string;
  senderName: string;
  recipientName: string;
  status: string;
  createdAt: string;
}

export interface KzDetail extends KzListItem {
  senderSide: string;
  address: string;
  deposit: string | null;
  draftContent: string | null;
  stampUrl: string | null;
  sentAt: string | null;
  serviceFee: number;
  postalFee: number;
  totalPaid: number;
  tracking: { trackingNo: string; step: number; deliveredAt: string | null } | null;
  lawyerReview: { decision: string; stampedAt: string | null; viewedAt: string | null; memo: string | null } | null;
  viewerRole: string;
}

/** 내 내용증명 사건 목록 로드 (GET /api/keepzip/cases — userId 기준) */
export function useKeepzipCases() {
  const [items, setItems] = useState<KzListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/keepzip/cases");
      const d = r.ok ? await r.json() : { cases: [] };
      setItems(Array.isArray(d.cases) ? d.cases : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, reload: load };
}

/** 사건 상세 단건 조회 (본문·진행상황 포함) */
export async function fetchKeepzipDetail(id: string): Promise<KzDetail | null> {
  try {
    const r = await fetch(`/api/keepzip/cases/${id}`);
    if (!r.ok) return null;
    const d = await r.json();
    return (d.case as KzDetail) ?? null;
  } catch {
    return null;
  }
}
