import { useState } from "react";
import { Button } from "@/components/common/Button";
import { DaumPostcodeModal } from "@/components/keepzip/DaumPostcodeModal";
import {
  SIDE_META, CAUSE_LABELS, CAUSE_DESC, activeFields, amountHint,
} from "@/lib/keepzip/case-form";
import type { DraftFormData, KeepzipCause } from "@/lib/keepzip/case-form";

interface Props {
  form: DraftFormData;
  loading: boolean;
  onSelectCause: (cause: KeepzipCause) => void;
  onField: (key: keyof DraftFormData, value: string) => void;
  onSubmit: () => void;
}

// 임대인(부동산/임대사업자) 대시보드 톤 — 초록 강조
const ON = "border-emerald-500 bg-emerald-50 text-emerald-700";
const SIDE = SIDE_META.landlord;
const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

/** 좌측 — 종류(임대인 3종) 선택 + 단일 입력 폼 */
export function CaseForm({ form, loading, onSelectCause, onField, onSubmit }: Props) {
  const [addrOpen, setAddrOpen] = useState(false);
  const fields = activeFields(form);
  const addressReady = form.address.trim() && (form.isBuilding !== "Y" || form.addressDetail.trim());
  const partyReady = form.senderName.trim() && form.recipientName.trim() && addressReady;
  const causeReady = fields.every((f) => String(form[f.key] ?? "").trim().length > 0);
  const canSubmit = !!form.cause && partyReady && causeReady;

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold mb-2">내용증명 종류</label>
        <div className="grid grid-cols-1 gap-2">
          {SIDE.causes.map((cause) => (
            <button key={cause} type="button" onClick={() => onSelectCause(cause)}
              className={`border rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                form.cause === cause ? ON : "hover:border-gray-400"
              }`}>
              <div className="font-medium">{CAUSE_LABELS[cause]}</div>
              <div className="text-xs text-gray-500 mt-0.5">{CAUSE_DESC[cause]}</div>
            </button>
          ))}
        </div>
      </div>

      {form.cause && (
        <>
          <div className="grid grid-cols-1 gap-3">
            <Field label={SIDE.senderLabel}>
              <input className={inputCls} value={form.senderName} placeholder="성명"
                onChange={(e) => onField("senderName", e.target.value)} />
            </Field>
            <Field label={SIDE.recipientLabel}>
              <input className={inputCls} value={form.recipientName} placeholder="성명"
                onChange={(e) => onField("recipientName", e.target.value)} />
            </Field>
            <Field label="목적물 주소">
              {form.address ? (
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
                  {form.zipCode && <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 flex-shrink-0">{form.zipCode}</span>}
                  <span className="flex-1">{form.address}</span>
                  <button type="button" className="text-xs text-gray-400 underline flex-shrink-0 hover:text-emerald-600" onClick={() => setAddrOpen(true)}>변경</button>
                </div>
              ) : (
                <button type="button" onClick={() => setAddrOpen(true)}
                  className="w-full border border-dashed border-emerald-300 rounded-lg py-2.5 text-sm text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50">
                  주소 검색
                </button>
              )}
              {form.isBuilding === "Y" && (
                <input className={`${inputCls} mt-2`} placeholder="동/호수 (예: 101동 1001호)"
                  value={form.addressDetail} onChange={(e) => onField("addressDetail", e.target.value)} />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === "select" ? (
                  <div className="flex flex-wrap gap-2">
                    {f.options?.map((opt) => (
                      <button key={opt.value} type="button" onClick={() => onField(f.key, opt.value)}
                        className={`border rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          form[f.key] === opt.value ? ON : "hover:border-gray-400"
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : f.type === "date" ? (
                  <input type="date" className={inputCls} value={String(form[f.key] ?? "")}
                    onChange={(e) => onField(f.key, e.target.value)} />
                ) : f.type === "amount" ? (
                  <div>
                    <input type="text" inputMode="numeric" className={inputCls} placeholder="0"
                      value={String(form[f.key] ?? "")}
                      onChange={(e) => onField(f.key, e.target.value.replace(/[^0-9]/g, ""))} />
                    {amountHint(String(form[f.key] ?? "")) && (
                      <p className="text-xs mt-1 text-emerald-600">{amountHint(String(form[f.key] ?? ""))}</p>
                    )}
                  </div>
                ) : (
                  <input type="text" className={inputCls} placeholder={f.placeholder}
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => onField(f.key, e.target.value)} />
                )}
              </Field>
            ))}
          </div>

          <Button variant="primary" onClick={onSubmit} loading={loading} disabled={!canSubmit} className="w-full">
            AI 내용증명 초안 생성
          </Button>
        </>
      )}

      {addrOpen && (
        <DaumPostcodeModal
          onClose={() => setAddrOpen(false)}
          onComplete={(r) => {
            onField("address", r.roadAddress);
            onField("zipCode", r.zonecode);
            onField("isBuilding", r.isBuilding ? "Y" : "N");
            onField("addressDetail", "");
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}
