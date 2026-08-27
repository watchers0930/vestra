"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import RenewalGnb from "../_shared/RenewalGnb";
import ExpertLoginGate from "./ExpertLoginGate";
import { useToast } from "@/components/common/toast";
import { EXPERT_FIELDS, type ExpertFieldKey, type ExpertFieldDef } from "./constants";

interface FormState {
  name: string;
  phone: string;
  office: string;
  bizNo: string;      // 사업자등록번호 (필수)
  license: string;    // 자격 등록번호/자격증 (필수)
}

const EMPTY: FormState = { name: "", phone: "", office: "", bizNo: "", license: "" };

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function ExpertSignupContent() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [field, setField] = useState<ExpertFieldDef | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const canSubmit =
    form.name.trim() && form.phone.trim() &&
    form.bizNo.trim() && form.license.trim();

  const selectField = (key: ExpertFieldKey) => {
    setField(EXPERT_FIELDS.find((f) => f.key === key) ?? null);
    setForm({ ...EMPTY });
    setDone(false);
  };

  const submit = async () => {
    if (!field || !canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/keepzip/expert/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: field.key, name: form.name, phone: form.phone,
          office: form.office, bizNo: form.bizNo, licenseNo: form.license,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error ?? "가입 신청에 실패했습니다.", "error");
        return;
      }
      setDone(true);
      showToast("전문가 가입 신청이 접수되었습니다. 심사 후 승인됩니다.", "success");
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <RenewalGnb />

      <div className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-1">전문가 가입</h1>
        <p className="text-sm text-gray-500 mb-6">분야를 선택하고 자격 정보를 입력하면, 심사 후 전문가 계정이 승인됩니다.</p>

        {status === "loading" ? (
          <p className="text-sm text-gray-400">불러오는 중…</p>
        ) : status !== "authenticated" ? (
          <ExpertLoginGate />
        ) : done ? (
          <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-6 text-center">
            <div className="text-emerald-700 font-semibold mb-1">가입 신청이 접수되었습니다</div>
            <p className="text-sm text-gray-600">사업자·자격 확인 후 전문가 계정이 승인됩니다.</p>
          </div>
        ) : (
          <>
            {/* 가입 계정 안내 (소셜 로그인 이메일) */}
            {session?.user?.email && (
              <p className="text-xs text-gray-500 mb-5">
                가입 계정: <span className="font-semibold text-gray-700">{session.user.email}</span>
              </p>
            )}

            {/* 분야 선택 */}
            <label className="block text-sm font-semibold mb-2">전문 분야</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
              {EXPERT_FIELDS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => selectField(f.key)}
                  className={`border rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    field?.key === f.key ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {field && (
              <div className="space-y-4">
                <Field label="성명"><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="예) 홍길동" /></Field>
                <Field label="연락처"><input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="010-0000-0000" /></Field>
                <Field label={field.officeLabel}><input className={inputCls} value={form.office} onChange={(e) => set("office", e.target.value)} placeholder="예) 법무법인 율지" /></Field>
                <Field label="사업자등록번호" required><input className={inputCls} value={form.bizNo} onChange={(e) => set("bizNo", e.target.value)} placeholder="000-00-00000" /></Field>
                <Field label={`${field.licenseLabel} (자격증)`} required><input className={inputCls} value={form.license} onChange={(e) => set("license", e.target.value)} placeholder={field.licensePlaceholder} /></Field>

                <button
                  type="button"
                  disabled={!canSubmit || submitting}
                  onClick={submit}
                  className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  {submitting ? "신청 중..." : `${field.label} 가입 신청`}
                </button>
                <p className="text-xs text-gray-400 text-center">사업자등록번호·자격 등록번호는 필수이며, 심사 후 승인됩니다.</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
