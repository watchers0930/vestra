"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import { RATING_ITEMS, type RatingKey } from "@/lib/keepzip/rating";
import s from "../profile-renewal.module.css";

interface Props {
  caseId: string;
  lawyerName?: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const EMPTY: Record<RatingKey, number> = {
  scoreExpertise: 0, scoreResponse: 0, scoreCommunication: 0, scoreResult: 0, scoreValue: 0,
};

/** 마이페이지 — 완료 사건의 변호사 후기 작성 모달(5항목 별점 + 코멘트). */
export default function RatingForm({ caseId, lawyerName, onClose, onSubmitted }: Props) {
  const [scores, setScores] = useState<Record<RatingKey, number>>(EMPTY);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRated = RATING_ITEMS.every(({ key }) => scores[key] >= 1);

  const submit = async () => {
    if (!allRated) { setError("모든 항목에 별점을 매겨주세요."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/keepzip/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, ...scores, comment }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setError(d?.error ?? "등록에 실패했습니다."); setSubmitting(false); return; }
      onSubmitted();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <div className={s.kzOverlay} onClick={onClose}>
      <div className={s.kzModal} onClick={(e) => e.stopPropagation()}>
        <div className={s.kzModalTop}>
          <div>
            <h3 className={s.appTitle} style={{ fontSize: 18 }}>변호사 후기 작성</h3>
            {lawyerName && <p className={s.appSub} style={{ marginTop: 2 }}>{lawyerName} 변호사</p>}
          </div>
          <button onClick={onClose} className={s.kzClose} aria-label="닫기"><X size={20} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          {RATING_ITEMS.map(({ key, label }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, color: "#333" }}>{label}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScores((p) => ({ ...p, [key]: n }))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 0 }}
                    aria-label={`${label} ${n}점`}
                  >
                    <Star size={22} style={{ color: "#f59e0b", fill: scores[key] >= n ? "#f59e0b" : "none" }} />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            placeholder="후기를 남겨주세요 (선택)"
            rows={3}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", fontSize: 14, resize: "vertical", fontFamily: "inherit" }}
          />

          {error && <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p>}

          <button onClick={submit} disabled={submitting} className={s.actBtn} style={{ width: "100%", padding: 12, justifyContent: "center" }}>
            {submitting ? "등록 중…" : "후기 등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
