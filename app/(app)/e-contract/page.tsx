"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { FileSignature, ChevronRight, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { useContractForm, ContractType } from "./hooks/useContractForm";
import { SpecialTermsEditor } from "./components/SpecialTermsEditor";

const CONTRACT_TYPES: { value: ContractType; label: string; desc: string }[] = [
  { value: "JEONSE", label: "전세계약", desc: "보증금을 맡기고 전세로 거주하는 계약" },
  { value: "MONTHLY", label: "월세계약", desc: "보증금 + 월 차임을 지급하는 계약" },
  { value: "SALE", label: "매매계약", desc: "주택 소유권을 이전하는 매매 계약" },
];

const STEP_LABELS = ["계약유형", "기본정보", "특약", "최종확인"];

export default function EContractPage() {
  const {
    step, setStep,
    form, update, appendSpecialTerm,
    submit, submitting, signUrl, error,
  } = useContractForm();

  const stepIdx = ["type", "basic", "terms", "confirm"].indexOf(step);

  return (
    <AuthGuard>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="전자계약서 작성"
          description="법적 효력이 있는 전자계약서를 작성하고 당사자 서명을 받습니다."
          icon={FileSignature}
        />

        {/* 완료 화면 */}
        {step === "done" && signUrl && (
          <div className="bg-white rounded-xl shadow p-8 text-center space-y-5">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">계약서 생성 완료</h2>
            <p className="text-gray-600 text-sm">
              아래 서명 링크로 접속하여 임대인(본인) 서명을 먼저 완료하세요.
              서명 후 임차인, 공인중개사에게 순서대로 링크가 전달됩니다.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono break-all text-gray-700">
              {`${typeof window !== "undefined" ? window.location.origin : ""}${signUrl}`}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  const url = `${window.location.origin}${signUrl}`;
                  navigator.clipboard.writeText(url);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <Copy className="w-4 h-4" />
                링크 복사
              </button>
              <a
                href={signUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4" />
                서명하러 이동
              </a>
            </div>
          </div>
        )}

        {step !== "done" && (
          <>
            {/* 스텝 인디케이터 */}
            <div className="flex items-center gap-1">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex items-center gap-1">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                      ${i < stepIdx ? "bg-green-500 text-white" : i === stepIdx ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}
                  >
                    {i < stepIdx ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs ${i === stepIdx ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                    {label}
                  </span>
                  {i < STEP_LABELS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                </div>
              ))}
            </div>

            {/* Step 1 — 계약 유형 */}
            {step === "type" && (
              <div className="bg-white rounded-xl shadow p-6 space-y-4">
                <h2 className="font-bold text-gray-900">어떤 계약서를 작성할까요?</h2>
                <div className="space-y-3">
                  {CONTRACT_TYPES.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update("contractType", value)}
                      className={`w-full text-left border-2 rounded-xl p-4 transition-colors
                        ${form.contractType === value
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <p className={`font-semibold ${form.contractType === value ? "text-blue-700" : "text-gray-800"}`}>
                        {label}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStep("basic")}
                  className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-sm"
                >
                  다음 →
                </button>
              </div>
            )}

            {/* Step 2 — 기본정보 */}
            {step === "basic" && (
              <div className="bg-white rounded-xl shadow p-6 space-y-4">
                <h2 className="font-bold text-gray-900">계약 기본정보</h2>
                <div className="space-y-3">
                  <FormField label="소재지" required>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                      placeholder="서울시 강남구 테헤란로 123, 101동 101호"
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="보증금" required>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.deposit}
                        onChange={(e) => update("deposit", e.target.value.replace(/[^0-9,]/g, ""))}
                        placeholder="200000000"
                        className={inputCls}
                      />
                      <span className="absolute right-3 top-2.5 text-sm text-gray-400">원</span>
                    </div>
                  </FormField>

                  {form.contractType === "MONTHLY" && (
                    <FormField label="월 차임">
                      <div className="relative">
                        <input
                          type="text"
                          value={form.monthlyRent}
                          onChange={(e) => update("monthlyRent", e.target.value.replace(/[^0-9,]/g, ""))}
                          placeholder="800000"
                          className={inputCls}
                        />
                        <span className="absolute right-3 top-2.5 text-sm text-gray-400">원/월</span>
                      </div>
                    </FormField>
                  )}

                  {form.contractType !== "SALE" && (
                    <FormField label="계약기간">
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={form.startDate}
                          onChange={(e) => update("startDate", e.target.value)}
                          className={`${inputCls} flex-1`}
                        />
                        <span className="text-gray-400 self-center">~</span>
                        <input
                          type="date"
                          value={form.endDate}
                          onChange={(e) => update("endDate", e.target.value)}
                          className={`${inputCls} flex-1`}
                        />
                      </div>
                    </FormField>
                  )}

                  <FormField label="임차인 이메일" required>
                    <input
                      type="email"
                      value={form.tenantEmail}
                      onChange={(e) => update("tenantEmail", e.target.value)}
                      placeholder="tenant@example.com"
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="공인중개사 이메일" hint="없으면 2자 직거래 계약">
                    <input
                      type="email"
                      value={form.brokerEmail}
                      onChange={(e) => update("brokerEmail", e.target.value)}
                      placeholder="broker@example.com (선택)"
                      className={inputCls}
                    />
                  </FormField>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("type")}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    ← 이전
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!form.address || !form.deposit || !form.tenantEmail) {
                        return;
                      }
                      setStep("terms");
                    }}
                    disabled={!form.address || !form.deposit || !form.tenantEmail}
                    className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 text-sm"
                  >
                    다음 →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — 특약 */}
            {step === "terms" && (
              <div className="bg-white rounded-xl shadow p-6 space-y-4">
                <h2 className="font-bold text-gray-900">특약사항 입력</h2>
                <p className="text-sm text-gray-500">
                  특약이 없으면 비워두고 넘어가도 됩니다.
                </p>
                <SpecialTermsEditor
                  value={form.specialTerms}
                  onChange={(v) => update("specialTerms", v)}
                  onAppend={appendSpecialTerm}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("basic")}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    ← 이전
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("confirm")}
                    className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-sm"
                  >
                    다음 →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4 — 최종 확인 */}
            {step === "confirm" && (
              <div className="bg-white rounded-xl shadow p-6 space-y-5">
                <h2 className="font-bold text-gray-900">최종 확인</h2>

                <div className="space-y-3 text-sm">
                  <ConfirmRow label="계약유형" value={form.contractType === "JEONSE" ? "전세" : form.contractType === "MONTHLY" ? "월세" : "매매"} />
                  <ConfirmRow label="소재지" value={form.address} />
                  <ConfirmRow label="보증금" value={`${parseInt(form.deposit.replace(/,/g, ""), 10).toLocaleString("ko-KR")}원`} />
                  {form.monthlyRent && (
                    <ConfirmRow label="월 차임" value={`${parseInt(form.monthlyRent.replace(/,/g, ""), 10).toLocaleString("ko-KR")}원/월`} />
                  )}
                  {form.startDate && (
                    <ConfirmRow label="계약기간" value={`${form.startDate} ~ ${form.endDate}`} />
                  )}
                  <ConfirmRow label="임차인" value={form.tenantEmail} />
                  {form.brokerEmail && <ConfirmRow label="공인중개사" value={form.brokerEmail} />}
                  {form.specialTerms && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="font-medium text-gray-500 mb-1">특약사항</p>
                      <p className="text-gray-700 whitespace-pre-wrap text-xs">{form.specialTerms}</p>
                    </div>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  계약 생성 후 임대인(본인) → 임차인 → 공인중개사 순서로 서명 링크가 전달됩니다.
                  모든 서명 완료 후 최종 PDF 계약서가 생성됩니다.
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("terms")}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    ← 이전
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-40 text-sm"
                  >
                    {submitting ? "생성 중…" : "계약서 생성 및 서명 링크 발급"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function FormField({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-gray-400 font-normal ml-1 text-xs">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      <span className="text-gray-800 flex-1">{value}</span>
    </div>
  );
}
