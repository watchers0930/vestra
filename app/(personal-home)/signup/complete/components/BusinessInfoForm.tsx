"use client";

/**
 * 사업자 정보 입력·제출 UI(설계 renewal.design §2.4·§3.2, AC-02). POST는 useRoleSetup 훅이 담당한다.
 *
 * ⚠️ HTTP 200은 **접수 성공**이지 승인/인증 완료가 아니다(서버는 requestedRole+verifyStatus="pending"만
 * 기록, role은 승격하지 않음). 따라서 "등록 완료/녹색 체크/자동이동" 없이, 제출 성공 시 **상위(onReceived)에
 * 접수 성공을 먼저 보존**하고 접수 패널은 상위가 렌더한다.
 *
 * 이 컴포넌트는 세션 갱신(update())을 직접 하지 않는다 — 과거 구현은 POST 성공 후 자식에서 await update()를
 * 호출했는데, update()가 세션을 "loading"으로 바꾸는 순간 상위 페이지가 폼 서브트리를 언마운트해 접수 상태가
 * 유실됐다(High-B). 접수 성공 보존·세션 갱신·접수 패널 수명은 상위가 안정적으로 소유한다. 입력/검증/표현만
 * 여기 둔다(단일 책임). 구 톤은 renewal 공통 토큰으로 교체한다. API 계약은 변경하지 않는다.
 */

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { SIGNUP_THEME } from "@/app/(personal-home)/renewal/_shared/signup-theme";
import { useRoleSetup } from "@/app/(personal-home)/signup/hooks/useRoleSetup";

interface BusinessInfoFormProps {
  intendedRole: string;
  /** 접수 성공을 상위에 보존(상위가 접수 패널 렌더·세션 갱신을 소유). 세션 갱신이 폼을 언마운트해도 유실 없음. */
  onReceived: () => void;
}

interface FormData {
  companyName: string;
  representName: string;
  businessNumber: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

function roleLabel(role: string): string {
  return role === "REALESTATE" ? "중개사" : role === "RENTAL_BIZ" ? "임대사업자" : "기업";
}

function validateBusinessNumber(value: string): boolean {
  return /^\d{10}$/.test(value.replace(/-/g, ""));
}

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.companyName.trim()) errors.companyName = "회사명을 입력해 주세요";
  if (!data.representName.trim()) errors.representName = "대표자명을 입력해 주세요";
  if (!data.businessNumber.trim()) {
    errors.businessNumber = "사업자등록번호를 입력해 주세요";
  } else if (!validateBusinessNumber(data.businessNumber)) {
    errors.businessNumber = "올바른 사업자등록번호 형식이 아닙니다 (10자리 숫자)";
  }
  return errors;
}

const FIELDS: Array<{ key: keyof FormData; label: (role: string) => string; placeholder: (role: string) => string; maxLength?: number }> = [
  {
    key: "companyName",
    label: (r) => (r === "REALESTATE" ? "중개사무소명" : r === "RENTAL_BIZ" ? "상호명" : "회사명"),
    placeholder: (r) => (r === "REALESTATE" ? "예: OO공인중개사사무소" : "예: OO건설 주식회사"),
  },
  { key: "representName", label: () => "대표자명", placeholder: () => "대표자 성명" },
  { key: "businessNumber", label: () => "사업자등록번호", placeholder: () => "000-00-00000", maxLength: 12 },
];

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 500, color: SIGNUP_THEME.text, marginBottom: 6 };

function inputStyle(hasError: boolean, isFocused: boolean): React.CSSProperties {
  const borderColor = hasError ? "#ef4444" : isFocused ? SIGNUP_THEME.accent : SIGNUP_THEME.border;
  return {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 12,
    border: `1px solid ${borderColor}`,
    fontSize: 14,
    color: SIGNUP_THEME.text,
    background: "#fff",
    outline: "none",
    // 키보드 포커스 식별용 링(인라인 style은 :focus-visible 불가 → onFocus/onBlur로 동등 표현). 오류는 적색 링.
    boxShadow: isFocused ? `0 0 0 3px ${hasError ? "rgba(239,68,68,0.25)" : "rgba(0,113,227,0.25)"}` : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };
}

export default function BusinessInfoForm({ intendedRole, onReceived }: BusinessInfoFormProps) {
  const { submitting: isSubmitting, error: submitError, submitBusiness, clearError } = useRoleSetup();

  const [formData, setFormData] = useState<FormData>({ companyName: "", representName: "", businessNumber: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [focused, setFocused] = useState<keyof FormData | null>(null);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (submitError) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // 제출 검증 실패 시 첫 오류 입력으로 포커스를 옮겨 오류를 찾기 쉽게 한다(§8.2 접근성).
      const firstKey = FIELDS.find((f) => validationErrors[f.key])?.key;
      if (firstKey && typeof document !== "undefined") {
        document.getElementById(`biz-${firstKey}`)?.focus();
      }
      return;
    }

    const result = await submitBusiness({
      role: intendedRole,
      companyName: formData.companyName.trim(),
      representName: formData.representName.trim(),
      businessNumber: formData.businessNumber.replace(/-/g, "").trim(),
    });
    // 접수 성공을 먼저 상위에 보존한다 — 세션 갱신/온보딩 재조회가 접수 상태를 덮지 않도록(AC-02, High-B).
    if (result.ok) onReceived();
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        borderRadius: SIGNUP_THEME.radius,
        border: `1px solid ${SIGNUP_THEME.border}`,
        background: SIGNUP_THEME.card,
        padding: 28,
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 700, color: SIGNUP_THEME.text, textAlign: "center", margin: 0 }}>
        {roleLabel(intendedRole) === "중개사" ? "중개사 정보 입력" : `${roleLabel(intendedRole)} 정보 입력`}
      </h1>
      <p style={{ textAlign: "center", fontSize: 13, color: SIGNUP_THEME.muted, margin: "6px 0 22px" }}>
        승인 심사를 위해 기본 정보를 입력해 주세요
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {FIELDS.map(({ key, label, placeholder, maxLength }) => (
          <div key={key}>
            <label htmlFor={`biz-${key}`} style={labelStyle}>
              {label(intendedRole)}
            </label>
            <input
              id={`biz-${key}`}
              type="text"
              value={formData[key]}
              maxLength={maxLength}
              onChange={(e) => handleChange(key, e.target.value)}
              onFocus={() => setFocused(key)}
              onBlur={() => setFocused(null)}
              placeholder={placeholder(intendedRole)}
              aria-invalid={errors[key] ? true : undefined}
              aria-describedby={errors[key] ? `biz-${key}-error` : undefined}
              style={inputStyle(!!errors[key], focused === key)}
            />
            {errors[key] && (
              <p id={`biz-${key}-error`} role="alert" style={{ fontSize: 12, color: "#ef4444", marginTop: 5 }}>
                {errors[key]}
              </p>
            )}
          </div>
        ))}
      </div>

      {submitError && (
        <div
          role="alert"
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 12,
            background: SIGNUP_THEME.dangerBg,
            color: SIGNUP_THEME.dangerText,
            padding: "11px 14px",
            fontSize: 13,
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} aria-hidden />
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%",
          marginTop: 22,
          padding: "13px 16px",
          borderRadius: 12,
          border: "none",
          background: SIGNUP_THEME.accent,
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: isSubmitting ? "not-allowed" : "pointer",
          opacity: isSubmitting ? 0.6 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={15} className="animate-spin" aria-hidden />
            접수 중…
          </>
        ) : (
          "인증 신청"
        )}
      </button>

      <p style={{ textAlign: "center", fontSize: 12, color: SIGNUP_THEME.faint, marginTop: 12 }}>
        인증 신청은 접수이며, 관리자 승인 후 해당 등급의 기능을 이용하실 수 있습니다
      </p>
    </form>
  );
}
