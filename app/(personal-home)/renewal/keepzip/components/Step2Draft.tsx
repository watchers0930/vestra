"use client";

import s from "../keepzip-renewal.module.css";
import { SignaturePad } from "@/app/(app)/e-contract/components/SignaturePad";
import type { DraftResult } from "@/lib/keepzip/case-form";

interface Props {
  draft: DraftResult | null;
  loading: boolean;
  error: string | null;
  senderName: string;
  signature: string;
  submitting: boolean;
  setDraftContent: (content: string) => void;
  setSignature: (v: string) => void;
  onProceed: () => void;
  onError: (msg: string) => void;
}

/** Step 2 — AI 초안 패널(우). 수정·서명 후 결제 단계로 진행 / PDF 내려받기. */
export function Step2Draft({
  draft, loading, error, senderName, signature, submitting,
  setDraftContent, setSignature, onProceed, onError,
}: Props) {
  const downloadPdf = async () => {
    if (!draft) return;
    try {
      const res = await fetch("/api/keepzip/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draft.title, content: draft.content, senderName, signature }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        onError(d?.error ?? "PDF 생성에 실패했습니다.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${draft.title || "내용증명"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      onError("PDF 다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
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
          <div style={{ marginTop: 16 }}>
            <SignaturePad value={signature} onChange={setSignature} label="발신인(본인)" />
          </div>
          <p className={s.note}>※ AI 초안입니다. 직접 수정할 수 있으며, 결제 후 담당 변호사의 검토·직인을 거쳐 발송됩니다.</p>
          <button className={s.submitBtn} style={{ marginTop: 12 }}
            disabled={submitting || !signature}
            onClick={onProceed}>
            {!signature ? "서명 후 결제 단계로" : "결제하고 진행하기"}
          </button>
          <button className={s.proceedBtn} onClick={downloadPdf}>서명 포함 PDF 내려받기</button>
        </>
      )}
    </div>
  );
}
