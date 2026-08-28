"use client";

import { useState } from "react";
import s from "../keepzip-renewal.module.css";
import { DaumPostcodeModal } from "@/components/keepzip/DaumPostcodeModal";
import { MyContractPicker } from "@/components/keepzip/MyContractPicker";
import type { ContractPrefill } from "@/lib/keepzip/use-keepzip-draft";
import {
  SIDE_META, CAUSE_LABELS, CAUSE_DESC, activeFields, amountHint,
  type DraftFormData, type KeepzipCause,
} from "@/lib/keepzip/case-form";

const SIDE = SIDE_META.tenant;

interface Props {
  form: DraftFormData;
  econtractId: string | null;
  loading: boolean;
  lawyerName?: string;
  selectCause: (cause: KeepzipCause) => void;
  setField: (key: keyof DraftFormData, value: string) => void;
  prefillFromContract: (c: ContractPrefill) => void;
  clearContract: () => void;
  onGenerate: () => void;
}

/** Step 1 — 정보입력 패널(좌). 종류 선택 → 당사자·주소 → 종류별 필드 → 초안 생성. */
export function Step1Input({
  form, econtractId, loading, lawyerName,
  selectCause, setField, prefillFromContract, clearContract, onGenerate,
}: Props) {
  const [addrOpen, setAddrOpen] = useState(false);
  const [dong, setDong] = useState("");
  const [ho, setHo] = useState("");

  // 동/호수를 각각 입력받아 "101동 1001호" 형태로 조합해 addressDetail에 저장.
  // (데이터 구조·서버·PDF는 addressDetail 하나만 사용하므로 UI에서만 분리)
  const setDetail = (d: string, h: string) => {
    setDong(d);
    setHo(h);
    const combined = [d.trim() && `${d.trim()}동`, h.trim() && `${h.trim()}호`]
      .filter(Boolean).join(" ");
    setField("addressDetail", combined);
  };

  const fields = activeFields(form);
  const addressReady = form.address.trim() && (form.isBuilding !== "Y" || form.addressDetail.trim());
  const partyReady = form.senderName.trim() && form.recipientName.trim() && addressReady;
  const causeReady = fields.every((f) => String(form[f.key] ?? "").trim().length > 0);
  const canSubmit = !!form.cause && partyReady && causeReady;

  return (
    <div className={s.panel}>
      {lawyerName && (
        <div className={s.assignBadge}>담당 변호사 <strong>{lawyerName}</strong> 검토 예정</div>
      )}
      <label className={s.blockLabel}>어떤 내용증명인가요?</label>
      <div className={s.causeList}>
        {SIDE.causes.map((cause) => (
          <button
            key={cause}
            type="button"
            className={`${s.causeBtn} ${form.cause === cause ? s.causeBtnOn : ""}`}
            onClick={() => selectCause(cause)}
          >
            <div className={s.causeName}>{CAUSE_LABELS[cause]}</div>
            <div className={s.causeDesc}>{CAUSE_DESC[cause]}</div>
          </button>
        ))}
      </div>

      {form.cause && (
        <>
          <MyContractPicker selectedId={econtractId} onSelect={prefillFromContract} onClear={clearContract} />
          <div className={s.field}>
            <label className={s.fieldLabel}>{SIDE.senderLabel}</label>
            <input className={s.input} value={form.senderName} placeholder="성명"
              onChange={(e) => setField("senderName", e.target.value)} />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>{SIDE.recipientLabel}</label>
            <input className={s.input} value={form.recipientName} placeholder="성명"
              onChange={(e) => setField("recipientName", e.target.value)} />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel}>목적물 주소</label>
            {form.address ? (
              <div className={s.addrPicked}>
                {form.zipCode && <span className={s.addrZip}>{form.zipCode}</span>}
                <span className={s.addrText}>{form.address}</span>
                <button type="button" className={s.addrChange} onClick={() => setAddrOpen(true)}>변경</button>
              </div>
            ) : (
              <button type="button" className={s.searchBtn} onClick={() => setAddrOpen(true)}>주소 검색</button>
            )}
            {form.isBuilding === "Y" && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input className={s.input} style={{ flex: 1 }} placeholder="동 (예: 101)"
                  value={dong} onChange={(e) => setDetail(e.target.value, ho)} />
                <input className={s.input} style={{ flex: 1 }} placeholder="호수 (예: 1001)"
                  value={ho} onChange={(e) => setDetail(dong, e.target.value)} />
              </div>
            )}
          </div>

          {fields.map((f) => (
            <div className={s.field} key={f.key}>
              <label className={s.fieldLabel}>{f.label}</label>
              {f.type === "select" ? (
                <div className={s.selGroup}>
                  {f.options?.map((opt) => (
                    <button key={opt.value} type="button"
                      className={`${s.selBtn} ${form[f.key] === opt.value ? s.selBtnOn : ""}`}
                      onClick={() => setField(f.key, opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : f.type === "date" ? (
                <input type="date" className={s.input} value={String(form[f.key] ?? "")}
                  onChange={(e) => setField(f.key, e.target.value)} />
              ) : f.type === "amount" ? (
                <>
                  <input type="text" inputMode="numeric" className={s.input} placeholder="0"
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => setField(f.key, e.target.value.replace(/[^0-9]/g, ""))} />
                  {amountHint(String(form[f.key] ?? "")) && (
                    <p className={s.hint}>{amountHint(String(form[f.key] ?? ""))}</p>
                  )}
                </>
              ) : (
                <input type="text" className={s.input} placeholder={f.placeholder}
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => setField(f.key, e.target.value)} />
              )}
            </div>
          ))}

          <button className={s.submitBtn} disabled={!canSubmit || loading} onClick={onGenerate}>
            {loading ? "생성 중..." : "AI 내용증명 초안 생성"}
          </button>
        </>
      )}

      {addrOpen && (
        <DaumPostcodeModal
          onClose={() => setAddrOpen(false)}
          onComplete={(r) => {
            setField("address", r.roadAddress);
            setField("zipCode", r.zonecode);
            setField("isBuilding", r.isBuilding ? "Y" : "N");
            setField("addressDetail", "");
            setDong("");
            setHo("");
          }}
        />
      )}
    </div>
  );
}
