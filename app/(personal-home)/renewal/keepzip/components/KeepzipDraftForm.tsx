"use client";

import { useState } from "react";
import s from "../keepzip-renewal.module.css";
import { useToast } from "@/components/common/toast";
import { DaumPostcodeModal } from "@/components/keepzip/DaumPostcodeModal";
import { useKeepzipDraft } from "@/lib/keepzip/use-keepzip-draft";
import {
  SIDE_META, CAUSE_LABELS, CAUSE_DESC, activeFields, amountHint,
} from "@/lib/keepzip/case-form";

const SIDE = SIDE_META.tenant;

interface Props {
  /** 배정된 담당 변호사명(변호사 미니홈페이지에서 진입 시) */
  lawyerName?: string;
}

/** 임차인 내용증명 작성 폼(좌) + AI 초안 패널(우). 리뉴얼 화면·변호사 미니홈페이지 공용. */
export function KeepzipDraftForm({ lawyerName }: Props) {
  const { showToast } = useToast();
  const { form, draft, loading, error, selectCause, setField, generateDraft, setDraftContent } = useKeepzipDraft();
  const [addrOpen, setAddrOpen] = useState(false);

  const fields = activeFields(form);
  const addressReady = form.address.trim() && (form.isBuilding !== "Y" || form.addressDetail.trim());
  const partyReady = form.senderName.trim() && form.recipientName.trim() && addressReady;
  const causeReady = fields.every((f) => String(form[f.key] ?? "").trim().length > 0);
  const canSubmit = !!form.cause && partyReady && causeReady;

  return (
    <div className={s.body}>
      <div className={s.grid}>
        {/* 좌: 입력 폼 */}
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
                  <input className={s.input} style={{ marginTop: 8 }} placeholder="동/호수 (예: 101동 1001호)"
                    value={form.addressDetail} onChange={(e) => setField("addressDetail", e.target.value)} />
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

              <button className={s.submitBtn} disabled={!canSubmit || loading} onClick={generateDraft}>
                {loading ? "생성 중..." : "AI 내용증명 초안 생성"}
              </button>
            </>
          )}
        </div>

        {/* 우: 초안 패널 */}
        <div className={`${s.panel} ${s.panelSticky}`}>
          <div className={s.docHead}>
            <span className={s.panelTitle}>내 용 증 명</span>
            {draft && <span className={s.docBadge}>AI 초안</span>}
          </div>

          {loading ? (
            <div className={s.loadWrap}><div className={s.spinner} />AI가 내용증명을 작성 중입니다...</div>
          ) : error ? (
            <div className={s.errBox}>{error}</div>
          ) : !draft ? (
            <div className={s.docEmpty}>왼쪽 정보를 입력하고<br />‘AI 내용증명 초안 생성’을 누르면<br />여기에 문서가 만들어집니다.</div>
          ) : (
            <>
              <div className={s.docTitle}>{draft.title}</div>
              <textarea className={s.docArea} value={draft.content}
                onChange={(e) => setDraftContent(e.target.value)} />
              <p className={s.note}>※ AI 초안입니다. 직접 수정할 수 있으며, 실제 발송 전 담당 변호사의 검토·직인을 거칩니다.</p>
              <button className={s.proceedBtn}
                onClick={() => showToast("초안이 준비되었습니다. 결제·변호사 검토 단계는 곧 연결됩니다.", "success")}>
                이 내용으로 진행하기
              </button>
            </>
          )}
        </div>
      </div>

      {addrOpen && (
        <DaumPostcodeModal
          onClose={() => setAddrOpen(false)}
          onComplete={(r) => {
            setField("address", r.roadAddress);
            setField("zipCode", r.zonecode);
            setField("isBuilding", r.isBuilding ? "Y" : "N");
            setField("addressDetail", "");
          }}
        />
      )}
    </div>
  );
}
