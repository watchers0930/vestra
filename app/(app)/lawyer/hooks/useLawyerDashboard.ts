"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/common/toast";

export interface NoticeCase {
  id: string;
  cause: string;
  senderName: string;
  recipientName: string;
  status: string;
  createdAt: string;
}

/** 검수 모달용 사건 상세 (문서 원문 포함) */
export interface ReviewDetail {
  id: string;
  cause: string;
  senderName: string;
  recipientName: string;
  address: string;
  deposit: string | null;
  draftContent: string | null;
  status: string;
}

export interface Consult {
  id: string;
  name: string;
  phone: string;
  topic: string;
  content: string;
  status: string;
  createdAt: string;
  preferredAt?: string | null;
  proposedAt?: string | null;
  confirmedAt?: string | null;
}

export interface Visit {
  id: string;
  name: string;
  phone: string;
  preferredAt: string;
  purpose: string;
  status: string;
  createdAt: string;
}

/**
 * 변호사 대시보드 데이터·액션 중앙화 훅
 *
 * 3개 API(내용증명·상담·방문)를 한 번에 병렬 로드해 히어로 KPI와
 * 각 탭이 같은 데이터를 공유한다(탭별 중복 호출 제거).
 */
export function useLawyerDashboard(
  wantNotices = true,
  wantConsults = true,
  wantVisits = true,
) {
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [cases, setCases] = useState<NoticeCase[]>([]);
  const [consults, setConsults] = useState<Consult[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<ReviewDetail | null>(null);

  const reload = useCallback(async () => {
    try {
      const [cRes, sRes, vRes] = await Promise.all([
        wantNotices ? fetch("/api/keepzip/cases?as=lawyer") : Promise.resolve(null),
        wantConsults ? fetch("/api/keepzip/consults?as=lawyer") : Promise.resolve(null),
        wantVisits ? fetch("/api/keepzip/visits?as=lawyer") : Promise.resolve(null),
      ]);
      if (cRes) {
        const cData = cRes.ok ? await cRes.json() : { cases: [] };
        setCases(Array.isArray(cData.cases) ? cData.cases : []);
      }
      if (sRes) {
        const sData = sRes.ok ? await sRes.json() : { consults: [] };
        setConsults(Array.isArray(sData.consults) ? sData.consults : []);
      }
      if (vRes) {
        const vData = vRes.ok ? await vRes.json() : { visits: [] };
        setVisits(Array.isArray(vData.visits) ? vData.visits : []);
      }
    } catch {
      setCases([]);
      setConsults([]);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, [wantNotices, wantConsults, wantVisits]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** 검수 시작 — 사건 원문 열람(서버가 viewedAt 기록, 승인 게이팅 근거) */
  const openReview = async (id: string) => {
    setBusy(id);
    try {
      const r = await fetch(`/api/keepzip/cases/${id}`);
      const d = r.ok ? await r.json() : null;
      if (!d?.case) {
        showToast("사건 상세를 불러오지 못했습니다.", "error");
        return;
      }
      setReviewing(d.case as ReviewDetail);
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setBusy(null);
    }
  };

  const closeReview = () => setReviewing(null);

  /** 내용증명 승인·전자직인 — 서버가 열람(viewedAt)·등록직인을 강제 검증 */
  const approveCase = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/keepzip/review/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approved" }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(d?.error ?? "처리에 실패했습니다.", "error");
        return;
      }
      showToast("전자직인 날인 완료. 발송 대기로 전환됩니다.", "success");
      setReviewing(null);
      reload();
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setBusy(null);
    }
  };

  /** 내용증명 반려 — 사유 필수 */
  const rejectCase = async (id: string, reason: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/keepzip/review/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "rejected", reason }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(d?.error ?? "반려 처리에 실패했습니다.", "error");
        return;
      }
      showToast("반려 처리되었습니다.", "success");
      setReviewing(null);
      reload();
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setBusy(null);
    }
  };

  /** 방문 예약 확정 */
  const confirmVisit = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch("/api/keepzip/visits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(d?.error ?? "확정 실패", "error");
        return;
      }
      showToast("방문 예약을 확정했습니다.", "success");
      reload();
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setBusy(null);
    }
  };

  /** 상담 희망시간 수락 */
  const acceptConsult = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/keepzip/consults/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) { showToast(d?.error ?? "처리에 실패했습니다.", "error"); return; }
      showToast("상담 시간을 수락했습니다.", "success");
      reload();
    } catch { showToast("네트워크 오류가 발생했습니다.", "error"); } finally { setBusy(null); }
  };

  /** 상담 다른 시간 역제안 */
  const proposeConsult = async (id: string, proposedAt: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/keepzip/consults/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "propose", proposedAt }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) { showToast(d?.error ?? "처리에 실패했습니다.", "error"); return; }
      showToast("다른 시간을 제안했습니다.", "success");
      reload();
    } catch { showToast("네트워크 오류가 발생했습니다.", "error"); } finally { setBusy(null); }
  };

  const counts = {
    notices: cases.filter((c) => c.status === "lawyer_pending").length,
    consults: consults.filter((c) => c.status !== "answered").length,
    visits: visits.filter((v) => v.status !== "confirmed").length,
  };
  const todoTotal = counts.notices + counts.consults + counts.visits;

  return {
    name: session?.user?.name || "전문가",
    loading,
    busy,
    cases,
    consults,
    visits,
    counts,
    todoTotal,
    reviewing,
    openReview,
    closeReview,
    approveCase,
    rejectCase,
    confirmVisit,
    acceptConsult,
    proposeConsult,
    reload,
  };
}
