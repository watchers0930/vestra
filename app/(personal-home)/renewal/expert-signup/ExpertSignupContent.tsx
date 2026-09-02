"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Scale, Stamp, Calculator, Landmark, Home, Check, ShieldCheck, ChevronLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import RenewalGnb from "../_shared/RenewalGnb";
import ExpertLoginGate from "./ExpertLoginGate";
import ExpertIntro from "./ExpertIntro";
import ExpertFooter from "../expert/components/ExpertFooter";
import { useToast } from "@/components/common/toast";
import { EXPERT_FIELDS, type ExpertFieldKey, type ExpertFieldDef } from "./constants";
import { formatMobile, formatOfficePhone, formatBizNo, maskPhone, maskEmail } from "@/lib/phone-format";

interface FormState {
  name: string;
  mobile: string;     // 휴대전화번호 (필수)
  officePhone: string; // 사무실 전화번호
  office: string;     // 소속 법인/사무소명
  bizNo: string;      // 사업자등록번호 (필수)
  license: string;    // 자격 등록번호/자격증 (필수)
}

const EMPTY: FormState = { name: "", mobile: "", officePhone: "", office: "", bizNo: "", license: "" };

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
  const [focusedPhone, setFocusedPhone] = useState<null | "mobile" | "officePhone">(null);
  const step2Ref = useRef<HTMLDivElement>(null);

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const canSubmit =
    !!form.name.trim() && !!form.mobile.trim() &&
    !!form.bizNo.trim() && !!form.license.trim();

  const selectField = (key: ExpertFieldKey) => {
    setField(EXPERT_FIELDS.find((f) => f.key === key) ?? null);
    setForm({ ...EMPTY });
    setDone(false);
    // STEP1 접힘 → STEP2 폼으로 자동 스크롤
    setTimeout(() => step2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  const submit = async () => {
    if (!field || !canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/keepzip/expert/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: field.key, name: form.name, phone: form.mobile, officePhone: form.officePhone,
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

      <div className="mx-auto px-8 py-10" style={{ maxWidth: 1200 }}>
        {/* 비로그인: 랜딩형 게이트 (자체 히어로 포함) */}
        {status === "loading" ? (
          <p className="py-20 text-center text-sm text-gray-400">불러오는 중…</p>
        ) : !authed ? (
          <ExpertLoginGate />
        ) : (
          /* 로그인 후: 로그인 전과 동일한 2칼럼 (좌 공유 인트로 / 우 자격등록 카드) */
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2.5rem", alignItems: "flex-start" }}>
            {/* 좌: 공유 인트로 */}
            <ExpertIntro />

            {/* 우: 자격 등록 카드 */}
            <div
              className="rounded-2xl border border-gray-200 bg-white p-7"
              style={{ flex: "0 0 420px", maxWidth: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
            >
              <h2 className="text-lg font-extrabold text-gray-900">전문가 자격 등록</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
                분야를 선택하고 자격 정보를 입력하면, 심사 후 전문가 계정이 승인됩니다.
              </p>
              {session?.user?.email && (
                <p className="mt-2 text-xs text-gray-400">
                  가입 계정 <span className="font-semibold text-gray-600">{maskEmail(session.user.email)}</span>
                </p>
              )}

              {/* 스텝 인디케이터 */}
              <div className="mt-6">
                <StepBar step={step} />
              </div>

              {done ? (
                /* 완료 화면 */
                <div className="mt-7 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                    <Check size={30} strokeWidth={3} color="#fff" />
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold text-gray-900">가입 신청이 접수되었습니다</h3>
                  <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-gray-500">
                    제출하신 사업자·자격 정보를 확인한 뒤 전문가 계정이 승인됩니다.
                    승인 완료 시 등록하신 연락처로 안내드립니다.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-[#fafbff] px-4 py-3 text-xs text-gray-500">
                    <ShieldCheck size={14} className="text-[#2e4bd8]" />
                    평균 심사 1~2 영업일 · 승인 즉시 전문가 홈페이지 활성화
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {/* STEP 1 — 분야 선택 (펼침) / 선택 요약 (접힘) */}
                  {!field ? (
                    <div>
                      <p className="mb-3 text-sm font-bold text-gray-900">① 전문 분야를 선택하세요</p>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {EXPERT_FIELDS.map((f) => {
                          const Icon = FIELD_ICON[f.key];
                          return (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => selectField(f.key)}
                              className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-[#2e4bd8] hover:bg-[#2e4bd8]/[0.04] hover:shadow-[0_2px_12px_rgba(46,75,216,0.12)]"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                                <Icon size={19} strokeWidth={2} color="#8a90a2" />
                              </div>
                              <span className="text-sm font-semibold text-gray-700">{f.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setField(null)}
                      className="flex w-full items-center justify-between rounded-2xl border border-[#2e4bd8]/30 bg-[#2e4bd8]/[0.05] px-4 py-3.5 text-left transition-colors hover:bg-[#2e4bd8]/[0.09]"
                    >
                      <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2e4bd8]">
                          <Check size={13} strokeWidth={3} color="#fff" />
                        </span>
                        {(() => { const Icon = FIELD_ICON[field.key]; return <Icon size={16} className="text-[#2e4bd8]" />; })()}
                        {field.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2e4bd8]">
                        <ChevronLeft size={13} /> 분야 변경
                      </span>
                    </button>
                  )}

                  {/* STEP 2 — 자격 정보 (분야 선택 전 잠김 / 선택 후 펼침 + 자동 스크롤) */}
                  <div ref={step2Ref} style={{ scrollMarginTop: 100 }}>
                    {!field ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-3.5 text-sm font-semibold text-gray-300">
                        ② 자격 정보 · 분야 선택 후 입력합니다
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-gray-100 bg-[#fafbff] p-5">
                        <p className="mb-5 flex items-center gap-2 text-sm font-bold text-gray-900">
                          {(() => { const Icon = FIELD_ICON[field.key]; return <Icon size={16} className="text-[#2e4bd8]" />; })()}
                          {field.label} 자격 정보
                        </p>
                        <div className="space-y-4">
                          <Field label="성명"><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="예) 홍길동" /></Field>
                          <Field label="휴대전화번호" required>
                            <input
                              className={inputCls}
                              inputMode="numeric"
                              value={focusedPhone === "mobile" ? form.mobile : maskPhone(form.mobile)}
                              onFocus={() => setFocusedPhone("mobile")}
                              onBlur={() => setFocusedPhone(null)}
                              onChange={(e) => set("mobile", formatMobile(e.target.value))}
                              placeholder="010-0000-0000"
                            />
                          </Field>
                          <Field label="사무실번호">
                            <input
                              className={inputCls}
                              inputMode="numeric"
                              value={focusedPhone === "officePhone" ? form.officePhone : maskPhone(form.officePhone)}
                              onFocus={() => setFocusedPhone("officePhone")}
                              onBlur={() => setFocusedPhone(null)}
                              onChange={(e) => set("officePhone", formatOfficePhone(e.target.value))}
                              placeholder="02-000-0000"
                            />
                          </Field>
                          <Field label={field.officeLabel}><input className={inputCls} value={form.office} onChange={(e) => set("office", e.target.value)} placeholder="예) 법무법인 율지" /></Field>
                          <Field label="사업자등록번호" required><input className={inputCls} inputMode="numeric" value={form.bizNo} onChange={(e) => set("bizNo", formatBizNo(e.target.value))} placeholder="000-00-00000" /></Field>
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
                  </div>
                </div>
              )}
            </div>
          </div>
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
