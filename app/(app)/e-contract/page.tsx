"use client";

import { AlertCircle, FileSignature, ChevronRight, ChevronLeft, CheckCircle, Download } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PartyForm } from "./components/PartyForm";
import { ContractGuidePanel } from "./components/ContractGuidePanel";
import { useContractForm, ContractType, Step } from "./hooks/useContractForm";

const STEP_ORDER: Step[] = ["type", "info", "parties", "confirm"];

const TYPES: { value: ContractType; label: string; desc: string; amountLabel: string }[] = [
  { value: "JEONSE", label: "전세", desc: "보증금을 맡기고 거주", amountLabel: "보증금" },
  { value: "MONTHLY", label: "월세", desc: "보증금 + 월 차임", amountLabel: "보증금" },
  { value: "SALE", label: "매매", desc: "소유권 이전", amountLabel: "매매가" },
];

const STD_TERMS = [
  "임대인은 잔금 지급일까지 등기부상 권리관계(근저당·가압류 등)를 현 상태로 유지한다.",
  "임차인은 계약 목적에 맞게 목적물을 사용하며, 임대인 동의 없이 구조 변경·전대하지 않는다.",
  "본 가계약은 당사자 간 오프라인 본계약 체결로 확정되며, 계약금 반환 조건은 별도 협의한다.",
];

const inputCls = "w-full border border-[#dfe2ec] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2e4bd8] bg-white";
const labelCls = "block text-xs font-semibold text-[#3a3f55] mb-1.5";

function comma(v: string) { const d = v.replace(/\D/g, ""); return d ? parseInt(d, 10).toLocaleString() : ""; }

export default function EContractPage() {
  const { step, setStep, form, update, updateParty, appendSpecialTerm, submit, submitting, pdfUrl, error, tenantSelfSign, setTenantSelfSign, tenantSignUrl } = useContractForm();
  const typeMeta = TYPES.find((t) => t.value === form.contractType)!;
  const stepIdx = STEP_ORDER.indexOf(step);

  const goNext = () => { if (stepIdx < STEP_ORDER.length - 1) setStep(STEP_ORDER[stepIdx + 1]); };
  const goPrev = () => { if (stepIdx > 0) setStep(STEP_ORDER[stepIdx - 1]); };

  // ── 완료 화면 (전체 폭)
  if (step === "done") {
    return (
      <AuthGuard featureName="가계약서">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {tenantSignUrl ? (
            <div className="bg-white rounded-xl shadow p-8 text-center space-y-5">
              <CheckCircle className="w-16 h-16 text-[#2e4bd8] mx-auto" />
              <h2 className="text-xl font-bold text-[#1a1d2e]">임차인 서명 링크가 발급됐습니다</h2>
              <p className="text-[#6b7180] text-sm">아래 링크를 임차인에게 전달하세요. 임차인이 직접 서명하면 가계약서가 확정됩니다. (링크 유효 72시간)</p>
              <div className="flex items-center gap-2 max-w-md mx-auto">
                <input readOnly value={tenantSignUrl} className="flex-1 border border-[#d8dcea] rounded-lg px-3 py-2.5 text-xs text-[#3a3f55]" />
                <button onClick={() => navigator.clipboard?.writeText(tenantSignUrl)} className="px-4 py-2.5 rounded-lg bg-[#2e4bd8] text-white text-sm font-semibold shrink-0">복사</button>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="bg-white rounded-xl shadow p-8 text-center space-y-5">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold text-[#1a1d2e]">가계약서 생성 완료</h2>
              <p className="text-[#6b7180] text-sm">아래에서 가계약서를 내려받아 출력하고, 당사자 간 오프라인으로 본계약을 확정하세요.</p>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2e4bd8] text-white text-sm font-semibold">
                <Download size={16} /> 가계약서 PDF 열기
              </a>
            </div>
          ) : null}
        </div>
      </AuthGuard>
    );
  }

  // ── 작성 단계: 2칼럼 (좌 설명 6 : 우 선택·입력 4)
  return (
    <AuthGuard featureName="가계약서">
      <div className="max-w-5xl px-4 py-6">
        <div className="econtract-2col">
          {/* 좌측: 설명 */}
          <ContractGuidePanel step={step} />

          {/* 우측: 선택·입력 */}
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* 1. 계약 유형 */}
            {step === "type" && (
              <div className="bg-white rounded-xl shadow p-5 space-y-3">
                {TYPES.map((t) => (
                  <button key={t.value} onClick={() => { update("contractType", t.value); goNext(); }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-[#e5e5e7] hover:border-[#2e4bd8] hover:bg-[#f5f6fa] transition-colors text-left">
                    <div>
                      <p className="font-bold text-[#1a1d2e]">{t.label}</p>
                      <p className="text-xs text-[#86868b] mt-0.5">{t.desc}</p>
                    </div>
                    <ChevronRight size={18} className="text-[#c7c7cc]" />
                  </button>
                ))}
              </div>
            )}

            {/* 2. 계약 정보 */}
            {step === "info" && (
              <div className="bg-white rounded-xl shadow p-5 space-y-4">
                <div>
                  <label className={labelCls}>목적물 주소</label>
                  <input className={inputCls} value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="서울시 강남구 …" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{typeMeta.amountLabel} (원)</label>
                    <input className={inputCls} value={form.deposit} onChange={(e) => update("deposit", comma(e.target.value))} placeholder="300,000,000" inputMode="numeric" />
                  </div>
                  {form.contractType === "MONTHLY" && (
                    <div>
                      <label className={labelCls}>월세 (원)</label>
                      <input className={inputCls} value={form.monthlyRent} onChange={(e) => update("monthlyRent", comma(e.target.value))} placeholder="1,500,000" inputMode="numeric" />
                    </div>
                  )}
                </div>
                {form.contractType !== "SALE" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>계약 시작일</label><input type="date" className={inputCls} value={form.startDate} onChange={(e) => update("startDate", e.target.value)} /></div>
                    <div><label className={labelCls}>계약 만료일</label><input type="date" className={inputCls} value={form.endDate} onChange={(e) => update("endDate", e.target.value)} /></div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>잔금 (원)</label><input className={inputCls} value={form.balance} onChange={(e) => update("balance", comma(e.target.value))} placeholder="선택" inputMode="numeric" /></div>
                  <div><label className={labelCls}>잔금 지급일</label><input type="date" className={inputCls} value={form.balanceDate} onChange={(e) => update("balanceDate", e.target.value)} /></div>
                </div>
                <div>
                  <label className={labelCls}>특약사항 (표준 조항)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {STD_TERMS.map((t, i) => (
                      <button key={i} onClick={() => appendSpecialTerm(t)} className="text-[11px] px-2 py-1 rounded-md bg-[#eef1fd] text-[#2e4bd8] hover:bg-[#e0e6fb]">+ 표준특약 {i + 1}</button>
                    ))}
                  </div>
                  <textarea className={`${inputCls} h-24 resize-y`} value={form.specialTerms} onChange={(e) => update("specialTerms", e.target.value)} placeholder="특약사항을 입력하거나 위 표준특약을 추가하세요" />
                </div>
                <div className="flex justify-between pt-1">
                  <button onClick={goPrev} className="flex items-center gap-1 text-sm text-[#6b7180]"><ChevronLeft size={16} /> 이전</button>
                  <button onClick={goNext} disabled={!form.address || !form.deposit} className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-[#2e4bd8] text-white text-sm font-semibold disabled:bg-[#aeb2bf]">다음 <ChevronRight size={16} /></button>
                </div>
              </div>
            )}

            {/* 3. 당사자·서명 */}
            {step === "parties" && (
              <div className="space-y-4">
                <PartyForm title="임대인" accent="#2e4bd8" party={form.landlord} onChange={(k, v) => updateParty("landlord", k, v)} />
                <label className="flex items-center gap-2 text-sm text-[#3a3f55] bg-[#f5f6fa] rounded-lg px-3 py-2.5 cursor-pointer">
                  <input type="checkbox" checked={tenantSelfSign} onChange={(e) => setTenantSelfSign(e.target.checked)} />
                  임차인이 직접 서명하도록 <b>서명 링크</b>를 발송합니다 (임차인 서명·주민번호는 링크에서 입력)
                </label>
                <PartyForm title="임차인" accent="#0f6e6e" party={form.tenant} onChange={(k, v) => updateParty("tenant", k, v)} />
                {tenantSelfSign && (
                  <p className="text-[11px] text-[#2e4bd8] bg-[rgba(46,75,216,0.06)] rounded-lg p-2.5">
                    임차인 이름만 입력하고 서명란은 비워두세요. 생성 후 임차인에게 보낼 <b>서명 링크</b>가 발급됩니다.
                  </p>
                )}
                <div className="flex justify-between">
                  <button onClick={goPrev} className="flex items-center gap-1 text-sm text-[#6b7180]"><ChevronLeft size={16} /> 이전</button>
                  <button onClick={goNext} className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-[#2e4bd8] text-white text-sm font-semibold">확인 <ChevronRight size={16} /></button>
                </div>
              </div>
            )}

            {/* 4. 확인·출력 */}
            {step === "confirm" && (
              <div className="bg-white rounded-xl shadow p-5 space-y-4">
                <h2 className="text-sm font-bold text-[#1a1d2e]">가계약서 내용 확인</h2>
                <dl className="text-sm divide-y divide-[#f0f0f2]">
                  {([
                    ["계약 형태", typeMeta.label],
                    ["목적물", form.address],
                    [typeMeta.amountLabel, form.deposit ? `${form.deposit}원` : "-"],
                    ...(form.contractType === "MONTHLY" ? [["월세", form.monthlyRent ? `${form.monthlyRent}원` : "-"]] : []),
                    ...(form.contractType !== "SALE" ? [["계약기간", `${form.startDate || "?"} ~ ${form.endDate || "?"}`]] : []),
                    ...(form.balance ? [["잔금", `${form.balance}원${form.balanceDate ? ` (${form.balanceDate})` : ""}`]] : []),
                    ["임대인", `${form.landlord.name} / ${form.landlord.phone}`],
                    ["임차인", `${form.tenant.name} / ${form.tenant.phone}`],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 gap-4"><dt className="text-[#86868b] shrink-0">{k}</dt><dd className="text-[#1a1d2e] text-right">{v}</dd></div>
                  ))}
                </dl>
                {form.specialTerms && (
                  <div><p className={labelCls}>특약사항</p><p className="text-xs text-[#3a3f55] whitespace-pre-wrap bg-[#f5f6fa] rounded-lg p-3">{form.specialTerms}</p></div>
                )}
                <p className="text-[11px] text-[#b86f00] bg-[rgba(255,149,0,0.08)] rounded-lg p-2.5">본 가계약서는 당사자 간 <b>오프라인 본계약 체결로 확정</b>됩니다.</p>
                <div className="flex justify-between pt-1">
                  <button onClick={goPrev} className="flex items-center gap-1 text-sm text-[#6b7180]"><ChevronLeft size={16} /> 이전</button>
                  <button onClick={submit} disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2e4bd8] text-white text-sm font-semibold disabled:bg-[#aeb2bf]">
                    <FileSignature size={16} /> {submitting ? "생성 중…" : "가계약서 생성·출력"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
