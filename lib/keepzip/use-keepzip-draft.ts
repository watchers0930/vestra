"use client";

import { useState, useCallback } from "react";
import { EMPTY_FORM, fullAddress } from "./case-form";
import type { DraftFormData, DraftResult, KeepzipCause } from "./case-form";

/**
 * 집키퍼 내용증명 초안 작성 상태 훅 — 발신 주체 고정형.
 * 임차인 화면은 side="tenant", 임대인 화면은 side="landlord"로 사용.
 * (주체 선택 UI는 라우트 그룹으로 이미 갈리므로 훅에는 없음)
 */
/** 프리필 소스 — 내 완료 계약(EContract) 요약 */
export interface ContractPrefill {
  id: string;
  address: string;
  deposit: string | null;
  contractType: string;
  startDate: string | null;
  endDate: string | null;
  landlordName: string;
}

export function useKeepzipDraft() {
  const [form, setForm] = useState<DraftFormData>({ ...EMPTY_FORM });
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 근거 전자계약 연결(갭1) — 프리필 시 세팅, cases 생성 시 함께 전송
  const [econtractId, setEcontractId] = useState<string | null>(null);

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
    // 프리필된 계약 연결 유지가 무의미해지는 핵심 필드를 손대면 연결 해제
    if (key === "address" || key === "recipientName") setEcontractId(null);
  }, []);

  // 내 완료 계약에서 임대인·주소·보증금·계약일·반환희망일 프리필 + 계약 FK 연결
  const prefillFromContract = useCallback((c: ContractPrefill) => {
    setForm((prev) => ({
      ...prev,
      recipientName: c.landlordName || prev.recipientName,
      address: c.address || prev.address,
      zipCode: "",
      addressDetail: "",
      isBuilding: "N", // 계약 주소 문자열에 동/호수 포함 → 별도 상세폼 불필요
      deposit: c.deposit ?? prev.deposit,
      contractDate: c.startDate ?? prev.contractDate,
      dueDate: c.endDate ?? prev.dueDate,
    }));
    setEcontractId(c.id);
    setError(null);
  }, []);

  const clearContract = useCallback(() => setEcontractId(null), []);

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

  return { form, draft, loading, error, econtractId, selectCause, setField, generateDraft, setDraftContent, prefillFromContract, clearContract };
}
