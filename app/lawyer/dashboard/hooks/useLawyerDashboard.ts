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

export interface Consult {
  id: string;
  name: string;
  phone: string;
  topic: string;
  content: string;
  status: string;
  createdAt: string;
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
export function useLawyerDashboard() {
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [cases, setCases] = useState<NoticeCase[]>([]);
  const [consults, setConsults] = useState<Consult[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [cRes, sRes, vRes] = await Promise.all([
        fetch("/api/keepzip/cases?as=lawyer"),
        fetch("/api/keepzip/consults?as=lawyer"),
        fetch("/api/keepzip/visits?as=lawyer"),
      ]);
      const cData = cRes.ok ? await cRes.json() : { cases: [] };
      const sData = sRes.ok ? await sRes.json() : { consults: [] };
      const vData = vRes.ok ? await vRes.json() : { visits: [] };
      setCases(Array.isArray(cData.cases) ? cData.cases : []);
      setConsults(Array.isArray(sData.consults) ? sData.consults : []);
      setVisits(Array.isArray(vData.visits) ? vData.visits : []);
    } catch {
      setCases([]);
      setConsults([]);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** 내용증명 검수·전자직인 */
  const approveCase = async (id: string) => {
    setBusy(id);
    try {
      // 전자직인 이미지(간단 생성) — 실제로는 등록된 직인 사용
      const c = document.createElement("canvas");
      c.width = 100;
      c.height = 50;
      const x = c.getContext("2d");
      if (x) {
        x.strokeStyle = "#c0392b";
        x.lineWidth = 2;
        x.strokeRect(8, 8, 84, 34);
        x.font = "15px sans-serif";
        x.fillStyle = "#c0392b";
        x.fillText("변호사印", 16, 32);
      }
      const stamp = c.toDataURL("image/png");
      const res = await fetch(`/api/keepzip/review/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approved", stamp }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(d?.error ?? "처리에 실패했습니다.", "error");
        return;
      }
      showToast("전자직인 날인 완료. 발송 대기로 전환됩니다.", "success");
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
    approveCase,
    confirmVisit,
    reload,
  };
}
