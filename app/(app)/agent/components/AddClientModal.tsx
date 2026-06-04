"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { FormInput } from "@/components/forms/FormInput";
import { TextAreaInput } from "@/components/forms/FormInput";

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    memo?: string;
    contractDate?: string;
    propertyAddress?: string;
  }) => Promise<void>;
}

export function AddClientModal({ open, onClose, onSubmit }: AddClientModalProps) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [memo, setMemo] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ESC 키로 닫기
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  // 모달 닫힐 때 폼 초기화
  useEffect(() => {
    if (!open) {
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      setMemo("");
      setContractDate("");
      setPropertyAddress("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clientName.trim()) {
      setError("고객명은 필수 항목입니다.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onSubmit({
        clientName: clientName.trim(),
        ...(clientPhone.trim() && { clientPhone: clientPhone.trim() }),
        ...(clientEmail.trim() && { clientEmail: clientEmail.trim() }),
        ...(memo.trim() && { memo: memo.trim() }),
        ...(contractDate && { contractDate }),
        ...(propertyAddress.trim() && { propertyAddress: propertyAddress.trim() }),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "고객 추가에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-[#1d1d1f]">고객 추가</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors"
          >
            <X size={18} className="text-[#86868b]" />
          </button>
        </div>

        {/* 본문 */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
            <FormInput
              label="고객명 *"
              placeholder="홍길동"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="전화번호"
                type="tel"
                placeholder="010-1234-5678"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
              <FormInput
                label="이메일"
                type="email"
                placeholder="email@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>

            <FormInput
              label="물건 주소"
              placeholder="서울 강남구 역삼동 123"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
            />

            <FormInput
              label="계약일"
              type="date"
              value={contractDate}
              onChange={(e) => setContractDate(e.target.value)}
            />

            <TextAreaInput
              label="메모"
              placeholder="고객 관련 메모를 입력하세요"
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
              disabled={!clientName.trim()}
            >
              등록
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
