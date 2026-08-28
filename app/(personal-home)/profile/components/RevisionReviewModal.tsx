"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { annotateAmounts } from "@/lib/keepzip/amount";
import { SignaturePad } from "@/app/(app)/e-contract/components/SignaturePad";
import type { KzDetail } from "../hooks/useKeepzipCases";
import s from "../profile-renewal.module.css";

interface Props {
  detail: KzDetail;
  onClose: () => void;
  onDone: () => void;
}

/** 마이페이지 — 변호사 수정본 재확인(원본↔수정본 비교 + 재서명 동의 / 재수정 요청). */
export default function RevisionReviewModal({ detail, onClose, onDone }: Props) {
  const [signature, setSignature] = useState("");
  const [rewriteMode, setRewriteMode] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async (body: object) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/keepzip/cases/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setError(d?.error ?? "처리에 실패했습니다."); setBusy(false); return; }
      onDone();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setBusy(false);
    }
  };

  const accept = () => {
    if (!signature) { setError("동의 서명을 입력해 주세요."); return; }
    call({ action: "accept", signature });
  };
  const requestRewrite = () => {
    if (!reason.trim()) { setError("재수정 요청 사유를 입력해 주세요."); return; }
    call({ action: "request_rewrite", reason: reason.trim() });
  };

  return (
    <div className={s.kzOverlay} onClick={onClose}>
      <div className={s.kzModal} onClick={(e) => e.stopPropagation()}>
        <div className={s.kzModalTop}>
          <div>
            <h3 className={s.appTitle} style={{ fontSize: 18 }}>변호사 수정본 확인</h3>
            <p className={s.appSub} style={{ marginTop: 2 }}>변호사가 문서를 수정했습니다. 확인 후 동의(재서명)하시면 발송됩니다.</p>
          </div>
          <button onClick={onClose} className={s.kzClose} aria-label="닫기"><X size={20} /></button>
        </div>

        {detail.lawyerReview?.memo && (
          <div className={s.kzMemo} style={{ marginTop: 12 }}><strong>변호사 수정 사유:</strong> {detail.lawyerReview.memo}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          {detail.originalDraft && (
            <div>
              <p className={s.kzDocLabel}>내가 작성한 원본</p>
              <div className={s.kzDoc} style={{ opacity: 0.65 }}>{annotateAmounts(detail.originalDraft)}</div>
            </div>
          )}
          <div>
            <p className={s.kzDocLabel}>변호사 수정본</p>
            <div className={s.kzDoc}>{detail.draftContent ? annotateAmounts(detail.draftContent) : "본문이 없습니다."}</div>
          </div>
        </div>

        {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 10 }}>{error}</p>}

        {!rewriteMode ? (
          <>
            <div style={{ marginTop: 16 }}>
              <SignaturePad value={signature} onChange={setSignature} label="동의 서명(발신인 본인)" />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setRewriteMode(true)} disabled={busy} className={s.actBtn} style={{ flex: "0 0 auto" }}>
                재수정 요청
              </button>
              <button
                onClick={accept}
                disabled={busy || !signature}
                className={s.actBtn}
                style={{ flex: 1, justifyContent: "center", background: "#0d9488", color: "#fff", borderColor: "#0d9488" }}
              >
                {busy ? "처리 중…" : "동의하고 발송"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 16 }}>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="어떤 부분을 다시 수정하면 좋을지 알려주세요."
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", fontSize: 14, resize: "vertical", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setRewriteMode(false)} disabled={busy} className={s.actBtn} style={{ flex: "0 0 auto" }}>
                취소
              </button>
              <button onClick={requestRewrite} disabled={busy || !reason.trim()} className={s.actBtn} style={{ flex: 1, justifyContent: "center" }}>
                {busy ? "처리 중…" : "재수정 요청 보내기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
