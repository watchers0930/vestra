"use client";

import { useState, useCallback } from "react";
import { EMPTY_FORM, fullAddress } from "./case-form";
import type { DraftFormData, DraftResult, KeepzipCause } from "./case-form";

/**
 * 집키퍼 내용증명 초안 작성 상태 훅 — 발신 주체 고정형.
 * 임차인 화면은 side="tenant", 임대인 화면은 side="landlord"로 사용.
 * (주체 선택 UI는 라우트 그룹으로 이미 갈리므로 훅에는 없음)
 */
export function useKeepzipDraft() {
  const [form, setForm] = useState<DraftFormData>({ ...EMPTY_FORM });
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectCause = useCallback((cause: KeepzipCause) => {
    // 종류 변경 시 종류 의존 필드만 초기화(당사자·주소 유지)
    setForm((prev) => ({
      ...prev, cause,
      deposit: "", arrears: "", contractDate: "", endDate: "",
      dueDate: "", reason: "", etcReason: "", arrearsStart: "",
    }));
    setDraft(null);
    setError(null);
  }, []);

  const setField = useCallback((key: keyof DraftFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const generateDraft = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/keepzip/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 도로명+상세주소를 합쳐 address로 전송
        body: JSON.stringify({ ...form, address: fullAddress(form) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "초안 생성에 실패했습니다.");
        return;
      }
      setDraft(data as DraftResult);
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [form]);

  const setDraftContent = useCallback((content: string) => {
    setDraft((prev) => (prev ? { ...prev, content } : prev));
  }, []);

  return { form, draft, loading, error, selectCause, setField, generateDraft, setDraftContent };
}
