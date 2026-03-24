"use client";

import { useState, useRef, useEffect } from "react";
import { X, AlertTriangle, CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/common";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  defaultLandlordName?: string;
  defaultAddress?: string;
}

const CASE_TYPES = [
  { value: "jeonse_fraud", label: "전세 사기" },
  { value: "deposit_fraud", label: "보증금 미반환" },
  { value: "rental_fraud", label: "임대 사기" },
  { value: "other", label: "기타" },
];

export default function ReportModal({
  open,
  onClose,
  defaultLandlordName = "",
  defaultAddress = "",
}: ReportModalProps) {
  const [form, setForm] = useState({
    landlordName: defaultLandlordName,
    address: defaultAddress,
    caseType: "jeonse_fraud",
    amount: "",
    description: "",
    contactEmail: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
      setSubmitted(false);
      setError("");
      setForm((prev) => ({
        ...prev,
        landlordName: defaultLandlordName,
        address: defaultAddress,
      }));
    } else {
      dialogRef.current?.close();
    }
  }, [open, defaultLandlordName, defaultAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.landlordName.trim() || !form.address.trim() || !form.description.trim()) {
      setError("필수 항목을 모두 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/landlord/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landlordName: form.landlordName,
          address: form.address,
          caseType: form.caseType,
          amount: form.amount ? Number(form.amount) : undefined,
          description: form.description,
          contactEmail: form.contactEmail || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "제보 접수에 실패했습니다.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "제보 접수에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({
      landlordName: "",
      address: "",
      caseType: "jeonse_fraud",
      amount: "",
      description: "",
      contactEmail: "",
    });
    setSubmitted(false);
    setError("");
    onClose();
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-full max-w-lg rounded-2xl border border-[#e5e5e7] bg-white p-0 shadow-2xl backdrop:bg-black/40"
      onClose={handleClose}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-[#e5e5e7] px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <h2 className="text-base font-semibold text-[#1d1d1f]">이 임대인 제보하기</h2>
        </div>
        <button
          onClick={handleClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f5f5f7] transition-colors"
        >
          <X className="h-4 w-4 text-[#6e6e73]" />
        </button>
      </div>

      {submitted ? (
        /* 제출 완료 */
        <div className="flex flex-col items-center gap-4 px-6 py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-7 w-7 text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[#1d1d1f]">제보가 접수되었습니다</p>
            <p className="mt-1 text-sm text-[#6e6e73]">
              내부 검토 후 반영됩니다. 감사합니다.
            </p>
          </div>
          <Button variant="secondary" onClick={handleClose} className="mt-2">
            닫기
          </Button>
        </div>
      ) : (
        /* 폼 */
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* 임대인명 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#1d1d1f]">
              임대인명 <span className="text-red-500">*</span>
            </label>
            <input
              value={form.landlordName}
              onChange={(e) => setForm({ ...form, landlordName: e.target.value })}
              placeholder="홍길동"
              className="w-full rounded-xl border border-[#e5e5e7] px-3 py-2.5 text-sm focus:border-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]"
            />
          </div>

          {/* 물건 주소 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#1d1d1f]">
              물건 주소 <span className="text-red-500">*</span>
            </label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="서울시 강남구 역삼동 123-45"
              className="w-full rounded-xl border border-[#e5e5e7] px-3 py-2.5 text-sm focus:border-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]"
            />
          </div>

          {/* 사기 유형 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#1d1d1f]">
              사기 유형 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.caseType}
              onChange={(e) => setForm({ ...form, caseType: e.target.value })}
              className="w-full rounded-xl border border-[#e5e5e7] px-3 py-2.5 text-sm focus:border-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]"
            >
              {CASE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* 피해 금액 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#1d1d1f]">
              피해 금액 (원) <span className="text-[#6e6e73] font-normal">선택</span>
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="300000000"
              className="w-full rounded-xl border border-[#e5e5e7] px-3 py-2.5 text-sm focus:border-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#1d1d1f]">
              상세 설명 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="사기 피해 내용을 자세히 설명해 주세요."
              rows={4}
              className="w-full rounded-xl border border-[#e5e5e7] px-3 py-2.5 text-sm focus:border-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#1d1d1f] resize-none"
            />
          </div>

          {/* 연락처 이메일 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#1d1d1f]">
              연락처 이메일 <span className="text-[#6e6e73] font-normal">선택</span>
            </label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              placeholder="example@email.com"
              className="w-full rounded-xl border border-[#e5e5e7] px-3 py-2.5 text-sm focus:border-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]"
            />
          </div>

          {/* 안내 */}
          <p className="text-[11px] text-[#6e6e73]">
            제보 내용은 내부 검토 후 반영됩니다. 허위 제보 시 법적 책임이 따를 수 있습니다.
          </p>

          {/* 제출 */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={handleClose}>
              취소
            </Button>
            <Button
              variant="danger"
              type="submit"
              icon={Send}
              loading={loading}
            >
              제보 접수
            </Button>
          </div>
        </form>
      )}
    </dialog>
  );
}
