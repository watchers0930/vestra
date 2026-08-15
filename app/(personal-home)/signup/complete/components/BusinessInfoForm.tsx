"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

interface BusinessInfoFormProps {
  intendedRole: string;
}

interface FormData {
  companyName: string;
  representName: string;
  businessNumber: string;
}

interface FormErrors {
  companyName?: string;
  representName?: string;
  businessNumber?: string;
}

function validateBusinessNumber(value: string): boolean {
  const cleaned = value.replace(/-/g, "");
  return /^\d{10}$/.test(cleaned);
}

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.companyName.trim()) {
    errors.companyName = "회사명을 입력해 주세요";
  }

  if (!data.representName.trim()) {
    errors.representName = "대표자명을 입력해 주세요";
  }

  if (!data.businessNumber.trim()) {
    errors.businessNumber = "사업자등록번호를 입력해 주세요";
  } else if (!validateBusinessNumber(data.businessNumber)) {
    errors.businessNumber = "올바른 사업자등록번호 형식이 아닙니다 (10자리 숫자)";
  }

  return errors;
}

export default function BusinessInfoForm({
  intendedRole,
}: BusinessInfoFormProps) {
  const router = useRouter();
  const { update } = useSession();

  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    representName: "",
    businessNumber: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/user/setup-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: intendedRole,
          companyName: formData.companyName.trim(),
          representName: formData.representName.trim(),
          businessNumber: formData.businessNumber.replace(/-/g, "").trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "등록에 실패했습니다. 다시 시도해 주세요.");
      }

      await update();
      setIsComplete(true);

      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 제출 완료 상태
  if (isComplete) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          등록이 완료되었습니다
        </h3>
        <p className="text-sm text-muted mb-1">
          {intendedRole === "REALESTATE" ? "중개사" : "기업"} 회원으로
          전환되었습니다.
        </p>
        <p className="text-xs text-muted">
          잠시 후 대시보드로 이동합니다...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card rounded-2xl border border-border p-8 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-center mb-1">
        {intendedRole === "REALESTATE" ? "중개사 정보 입력" : "기업 정보 입력"}
      </h2>
      <p className="text-center text-sm text-muted mb-6">
        등급 승인을 위해 기본 정보를 입력해 주세요
      </p>

      <div className="space-y-4">
        {/* 회사명 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {intendedRole === "REALESTATE" ? "중개사무소명" : "회사명"}
          </label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => handleChange("companyName", e.target.value)}
            placeholder={
              intendedRole === "REALESTATE"
                ? "예: OO공인중개사사무소"
                : "예: OO건설 주식회사"
            }
            className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-transparent text-foreground placeholder:text-muted/50 outline-none transition-colors ${
              errors.companyName
                ? "border-red-400 focus:border-red-500"
                : "border-border focus:border-primary"
            }`}
          />
          {errors.companyName && (
            <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>
          )}
        </div>

        {/* 대표자명 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            대표자명
          </label>
          <input
            type="text"
            value={formData.representName}
            onChange={(e) => handleChange("representName", e.target.value)}
            placeholder="대표자 성명"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-transparent text-foreground placeholder:text-muted/50 outline-none transition-colors ${
              errors.representName
                ? "border-red-400 focus:border-red-500"
                : "border-border focus:border-primary"
            }`}
          />
          {errors.representName && (
            <p className="text-xs text-red-500 mt-1">{errors.representName}</p>
          )}
        </div>

        {/* 사업자등록번호 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            사업자등록번호
          </label>
          <input
            type="text"
            value={formData.businessNumber}
            onChange={(e) => handleChange("businessNumber", e.target.value)}
            placeholder="000-00-00000"
            maxLength={12}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-transparent text-foreground placeholder:text-muted/50 outline-none transition-colors ${
              errors.businessNumber
                ? "border-red-400 focus:border-red-500"
                : "border-border focus:border-primary"
            }`}
          />
          {errors.businessNumber && (
            <p className="text-xs text-red-500 mt-1">
              {errors.businessNumber}
            </p>
          )}
        </div>
      </div>

      {/* 서버 에러 */}
      {submitError && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {submitError}
        </div>
      )}

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-6 px-4 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            등록 중...
          </>
        ) : (
          "등록 신청"
        )}
      </button>

      <p className="text-center text-xs text-muted mt-3">
        관리자 승인 후 해당 등급의 기능을 이용하실 수 있습니다
      </p>
    </form>
  );
}
