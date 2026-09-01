"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Scale, Stamp, Calculator, Landmark, Home, Check, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import RenewalGnb from "../_shared/RenewalGnb";
import ExpertLoginGate from "./ExpertLoginGate";
import ExpertFooter from "../expert/components/ExpertFooter";
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

/** 분야별 아이콘 */
const FIELD_ICON: Record<ExpertFieldKey, LucideIcon> = {
  lawyer: Scale,
  judicial: Stamp,
  tax: Calculator,
  accountant: Landmark,
  appraiser: Home,
};

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-[#2e4bd8] focus:outline-none focus:ring-2 focus:ring-[#2e4bd8]/15";

export default function ExpertSignupContent() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [field, setField] = useState<ExpertFieldDef | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const canSubmit =
    !!form.name.trim() && !!form.phone.trim() &&
    !!form.bizNo.trim() && !!form.license.trim();

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

  const authed = status === "authenticated";
  // 진행 단계: 1 분야선택 · 2 정보입력 · 3 심사
  const step = done ? 3 : field ? 2 : 1;

  return (
    <>
      <RenewalGnb />

      <div className="mx-auto px-8 py-10" style={{ maxWidth: authed ? 672 : 1200 }}>
        {/* 비로그인: 랜딩형 게이트 (자체 히어로 포함) */}
        {status === "loading" ? (
          <p className="py-20 text-center text-sm text-gray-400">불러오는 중…</p>
        ) : !authed ? (
          <ExpertLoginGate />
        ) : (
          <>
            {/* 헤더 */}
            <div className="mb-7 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2e4bd8]/8 px-3.5 py-1.5 text-xs font-semibold text-[#2e4bd8]">
                <ShieldCheck size={13} /> 전문가 파트너 가입
              </span>
              <h1 className="mt-3 text-[26px] font-extrabold text-gray-900">전문가 자격 등록</h1>
              <p className="mt-2 text-sm text-gray-500">
                분야를 선택하고 자격 정보를 입력하면, 심사 후 전문가 계정이 승인됩니다.
              </p>
              {session?.user?.email && (
                <p className="mt-2 text-xs text-gray-400">
                  가입 계정 <span className="font-semibold text-gray-600">{session.user.email}</span>
                </p>
              )}
            </div>

            {/* 스텝 인디케이터 */}
            <StepBar step={step} />

            {done ? (
              /* 완료 화면 */
              <div className="mt-8 overflow-hidden rounded-3xl border border-gray-100 bg-white text-center shadow-[0_4px_24px_rgba(0,0,0,0.05)]">
                <div className="px-8 pt-10">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                    <Check size={30} strokeWidth={3} color="#fff" />
                  </div>
                  <h2 className="mt-5 text-xl font-extrabold text-gray-900">가입 신청이 접수되었습니다</h2>
                  <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-gray-500">
                    제출하신 사업자·자격 정보를 확인한 뒤 전문가 계정이 승인됩니다.
                    승인 완료 시 등록하신 연락처로 안내드립니다.
                  </p>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 border-t border-gray-100 bg-[#fafbff] px-8 py-4 text-xs text-gray-500">
                  <ShieldCheck size={14} className="text-[#2e4bd8]" />
                  평균 심사 소요 1~2 영업일 · 승인 즉시 전문가 홈페이지가 활성화됩니다
                </div>
              </div>
            ) : (
              <>
                {/* 분야 선택 (카드형) */}
                <div className="mt-8">
                  <p className="mb-3 text-sm font-bold text-gray-900">전문 분야를 선택하세요</p>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {EXPERT_FIELDS.map((f) => {
                      const Icon = FIELD_ICON[f.key];
                      const active = field?.key === f.key;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => selectField(f.key)}
                          className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                            active
                              ? "border-[#2e4bd8] bg-[#2e4bd8]/[0.06] shadow-[0_2px_12px_rgba(46,75,216,0.12)]"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-[#2e4bd8]" : "bg-gray-100"}`}>
                            <Icon size={19} strokeWidth={2} color={active ? "#fff" : "#8a90a2"} />
                          </div>
                          <span className={`text-sm font-semibold ${active ? "text-[#2e4bd8]" : "text-gray-700"}`}>{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 자격 정보 폼 */}
                {field && (
                  <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_14px_rgba(0,0,0,0.05)]">
                    <p className="mb-5 flex items-center gap-2 text-sm font-bold text-gray-900">
                      {(() => { const Icon = FIELD_ICON[field.key]; return <Icon size={16} className="text-[#2e4bd8]" />; })()}
                      {field.label} 자격 정보
                    </p>
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
                        className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ background: canSubmit && !submitting ? "linear-gradient(135deg,#2e4bd8,#4f46e5)" : "#c7ccdb" }}
                      >
                        {submitting ? "신청 중..." : `${field.label} 가입 신청`}
                      </button>
                      <p className="text-center text-xs text-gray-400">
                        사업자등록번호·자격 등록번호는 필수이며, 제출 후 심사를 거쳐 승인됩니다.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <ExpertFooter />
    </>
  );
}

/** 스텝 인디케이터 */
function StepBar({ step }: { step: number }) {
  const steps = ["분야 선택", "자격 정보", "심사 대기"];
  return (
    <div className="flex items-center justify-center">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = step >= n;
        const isLast = i === steps.length - 1;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  active ? "text-white" : "border border-gray-200 bg-white text-gray-400"
                }`}
                style={active ? { background: "#2e4bd8" } : undefined}
              >
                {step > n ? <Check size={15} strokeWidth={3} /> : n}
              </div>
              <span className={`mt-1.5 text-[11px] font-medium ${active ? "text-gray-800" : "text-gray-400"}`}>{label}</span>
            </div>
            {!isLast && <div className={`mx-2 mb-5 h-px w-10 sm:w-16 ${step > n ? "bg-[#2e4bd8]" : "bg-gray-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
