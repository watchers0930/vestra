"use client";

import { useCallback, useEffect, useState } from "react";
import { useKeepzipDraft } from "@/lib/keepzip/use-keepzip-draft";
import { fullAddress } from "@/lib/keepzip/case-form";
import type { JourneyView } from "@/lib/keepzip/journey-types";

interface Options {
  /** 변호사 미니홈페이지에서 진입 시 배정 변호사 */
  lawyerName?: string;
  lawyerId?: string;
  onError?: (msg: string) => void;
}

/**
 * 집키퍼 단일 여정 상태 훅.
 * - 작성(compose)/검토·결제(review)/진행현황(track) 3뷰 전환
 * - 초안 작성 상태는 useKeepzipDraft에 위임하고 여기서 여정 흐름만 관리
 * - 뒤로가기(popstate)로 이전 뷰 복귀
 */
export function useKeepzipJourney({ lawyerName, lawyerId, onError }: Options = {}) {
  const draft = useKeepzipDraft();
  const [view, setViewState] = useState<JourneyView>("compose");
  const [signature, setSignature] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [caseStatus, setCaseStatus] = useState<string>("draft");
  const [trackingNo, setTrackingNo] = useState<string | null>(null);
  const [assignedLawyer, setAssignedLawyer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 뷰 전환 시 history에 기록 → 브라우저 뒤로가기로 이전 뷰 복귀
  const goView = useCallback((next: JourneyView) => {
    setViewState((cur) => {
      if (cur !== next && typeof window !== "undefined") {
        window.history.pushState({ keepzipView: next }, "");
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const v = (e.state?.keepzipView as JourneyView) ?? "compose";
      setViewState(v);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /** 작성 완료 → 사건 생성(검토 대기) → 검토 뷰로 이동 */
  const requestReview = useCallback(async () => {
    if (!draft.draft) return;
    setSubmitting(true);
    try {
      // 담당 변호사 결정 — 미니홈 진입 시 지정, 메인 여정은 배정 가능한 변호사 자동 선택(데모)
      let effLawyerId = lawyerId ?? "";
      if (!effLawyerId) {
        const lr = await fetch("/api/keepzip/experts?category=%EB%B3%80%ED%98%B8%EC%82%AC");
        const ld = await lr.json().catch(() => null);
        const first = ld?.experts?.[0];
        if (!first?.id) {
          onError?.("배정 가능한 변호사가 없습니다.");
          return;
        }
        effLawyerId = first.id;
        setAssignedLawyer(first.name ?? null);
      }
      const res = await fetch("/api/keepzip/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cause: draft.form.cause,
          senderSide: "tenant",
          senderName: draft.form.senderName,
          recipientName: draft.form.recipientName,
          address: fullAddress(draft.form),
          lawyerId: effLawyerId,
          deposit: draft.form.deposit,
          econtractId: draft.econtractId ?? undefined,
          draftContent: draft.draft.content,
          signatureUrl: signature,
        }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        onError?.(d?.error ?? "검토 요청에 실패했습니다.");
        return;
      }
      setCaseId(d?.id ?? null);
      setCaseStatus("lawyer_pending");
      goView("review");
    } catch {
      onError?.("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [draft.draft, draft.form, draft.econtractId, signature, lawyerId, goView, onError]);

  /** 데모 상태 전이(승인/결제·발송/배달/반송) — 서버 DB에 반영 */
  const demoAdvance = useCallback(
    async (action: "approve" | "pay" | "deliver" | "return") => {
      if (!caseId) return null;
      setSubmitting(true);
      try {
        const res = await fetch(`/api/keepzip/cases/${caseId}/demo-advance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok) {
          onError?.(d?.error ?? "처리에 실패했습니다.");
          return null;
        }
        setCaseStatus(d.status);
        if (d.trackingNo) setTrackingNo(d.trackingNo);
        return d as { status: string; trackingNo?: string };
      } catch {
        onError?.("네트워크 오류가 발생했습니다.");
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [caseId, onError],
  );

  return {
    ...draft,
    view,
    goView,
    signature,
    setSignature,
    caseId,
    caseStatus,
    setCaseStatus,
    trackingNo,
    submitting,
    requestReview,
    demoAdvance,
    lawyerName: lawyerName ?? assignedLawyer ?? undefined,
    lawyerId,
  };
}
