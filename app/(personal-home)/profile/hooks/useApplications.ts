"use client";

import { useState, useEffect, useCallback } from "react";

export type AppStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export interface AppItem {
  id: string;
  listingId: string;
  moveInDate: string;
  duration: number | null;
  memo: string | null;
  proposedDeposit: string | null;
  status: AppStatus;
  rejectionReason?: string | null;
  contractRequestedAt?: string | null; // 신청자가 가계약서 작성을 요청한 시각 (요청 완료 여부)
  createdAt: string;
  applicant?: { name: string | null; companyName?: string | null } | null;
  listing: {
    address: string;
    listingType: string;
    deposit: string | null;
    photos: string[] | null;
    owner?: { name: string | null; companyName: string | null } | null;
  } | null;
}

export type ReceivedFilter = "ALL" | "PENDING" | "ACCEPTED" | "REJECTED";

/** PATCH /api/contract-applications/[id] — 상태 변경 (철회/수락/거절) */
async function patchStatus(id: string, status: AppStatus): Promise<boolean> {
  const res = await fetch(`/api/contract-applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    alert(j.error ?? "처리에 실패했습니다.");
    return false;
  }
  return true;
}

/** DELETE /api/contract-applications/[id] */
async function removeApp(id: string): Promise<boolean> {
  const res = await fetch(`/api/contract-applications/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    alert(j.error ?? "삭제에 실패했습니다.");
    return false;
  }
  return true;
}

/** 보낸 의향서 — GET /api/contract-applications/mine */
export function useSentApplications() {
  const [items, setItems] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/contract-applications/mine");
        if (res.ok && alive) setItems((await res.json()).applications ?? []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function withdraw(id: string) {
    if (!confirm("이 의향서를 철회하시겠습니까?")) return;
    setBusyId(id);
    try {
      if (await patchStatus(id, "WITHDRAWN")) {
        setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status: "WITHDRAWN" } : a)));
      }
    } finally { setBusyId(null); }
  }

  async function remove(id: string) {
    if (!confirm("이 의향서를 삭제하시겠습니까? 복구할 수 없습니다.")) return;
    setBusyId(id);
    try {
      if (await removeApp(id)) setItems((prev) => prev.filter((a) => a.id !== id));
    } finally { setBusyId(null); }
  }

  // 신청자(개인) → 소유주(업자)에게 가계약서 작성 요청 (POST)
  async function requestContract(id: string) {
    if (!confirm("임대인/중개사에게 가계약서 작성을 요청하시겠습니까?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/contract-applications/${id}/request-contract`, { method: "POST" });
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        const at = j.contractRequestedAt ?? new Date().toISOString();
        setItems((prev) => prev.map((a) => (a.id === id ? { ...a, contractRequestedAt: at } : a)));
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "요청에 실패했습니다.");
      }
    } finally { setBusyId(null); }
  }

  return { items, loading, busyId, withdraw, remove, requestContract };
}

/** 받은 의향서 — GET /api/contract-applications(?status=) */
export function useReceivedApplications() {
  const [items, setItems] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReceivedFilter>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter !== "ALL" ? `?status=${filter}` : "";
      const res = await fetch(`/api/contract-applications${q}`);
      if (res.ok) setItems((await res.json()).applications ?? []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function decide(id: string, status: "ACCEPTED" | "REJECTED") {
    const msg = status === "ACCEPTED" ? "이 의향서를 수락하시겠습니까?" : "이 의향서를 거절하시겠습니까?";
    if (!confirm(msg)) return;
    setBusyId(id);
    try {
      if (await patchStatus(id, status)) {
        setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      }
    } finally { setBusyId(null); }
  }

  async function remove(id: string) {
    if (!confirm("이 의향서를 삭제하시겠습니까? 복구할 수 없습니다.")) return;
    setBusyId(id);
    try {
      if (await removeApp(id)) setItems((prev) => prev.filter((a) => a.id !== id));
    } finally { setBusyId(null); }
  }

  return { items, loading, filter, setFilter, busyId, decide, remove };
}
