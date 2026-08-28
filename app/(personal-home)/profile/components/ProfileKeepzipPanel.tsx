"use client";

import { useState } from "react";
import { FileText, X, CheckCircle2 } from "lucide-react";
import { CAUSE_LABELS } from "@/lib/keepzip/case-form";
import { annotateAmounts } from "@/lib/keepzip/amount";
import { statusMeta, KEEPZIP_TIMELINE, timelineStep, type StatusTone } from "@/lib/keepzip/case-status";
import { useKeepzipCases, fetchKeepzipDetail, type KzListItem, type KzDetail } from "../hooks/useKeepzipCases";
import s from "../profile-renewal.module.css";

/** tone → 기존 상태 pill 클래스 매핑(디자인 시스템 재사용) */
const PILL: Record<StatusTone, string> = {
  pending: s.stWithdrawn,
  progress: s.stPending,
  done: s.stAccepted,
  fail: s.stRejected,
};

const fmtDate = (v: string) => new Date(v).toLocaleDateString("ko-KR");
const causeLabel = (c: string) => CAUSE_LABELS[c as keyof typeof CAUSE_LABELS] ?? c;

/** 진행 타임라인 — 4단계 가로 스텝 */
function Timeline({ status }: { status: string }) {
  const cur = timelineStep(status);
  if (cur < 0) {
    const m = statusMeta(status);
    return <div className={s.kzFail}>{m.label} — {m.desc}</div>;
  }
  return (
    <div className={s.kzTimeline}>
      {KEEPZIP_TIMELINE.map((label, i) => {
        const done = i <= cur;
        return (
          <div key={label} className={s.kzStep}>
            {i < KEEPZIP_TIMELINE.length - 1 && <span className={`${s.kzLine} ${i < cur ? s.kzDone : ""}`} />}
            <span className={`${s.kzStepDot} ${done ? s.kzDone : ""}`}>
              {done ? <CheckCircle2 size={16} /> : i + 1}
            </span>
            <span className={`${s.kzStepLabel} ${done ? s.kzDone : ""}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** 사건 상세 모달 — 원문 + 진행상황 */
function DetailModal({ detail, onClose }: { detail: KzDetail; onClose: () => void }) {
  const m = statusMeta(detail.status);
  return (
    <div className={s.kzOverlay} onClick={onClose}>
      <div className={s.kzModal} onClick={(e) => e.stopPropagation()}>
        <div className={s.kzModalTop}>
          <div>
            <span className={`${s.statusPill} ${PILL[m.tone]}`}>{m.label}</span>
            <h3 className={s.appTitle} style={{ fontSize: 18, marginTop: 10, whiteSpace: "normal" }}>{causeLabel(detail.cause)}</h3>
            <p className={s.appSub} style={{ marginTop: 2 }}>{detail.senderName} → {detail.recipientName}</p>
          </div>
          <button onClick={onClose} className={s.kzClose} aria-label="닫기"><X size={20} /></button>
        </div>

        {m.desc && <p className={s.kzStatusDesc}>{m.desc}</p>}

        <Timeline status={detail.status} />

        {detail.status === "canceled" && detail.lawyerReview?.memo && (
          <div className={s.kzMemo}><strong>반려 사유:</strong> {detail.lawyerReview.memo}</div>
        )}

        {detail.tracking?.trackingNo && (
          <p className={s.kzTrack}>등기번호 <strong>{detail.tracking.trackingNo}</strong>
            {detail.tracking.deliveredAt && <> · {fmtDate(detail.tracking.deliveredAt)} 배달</>}</p>
        )}

        <p className={s.kzDocLabel}>내용증명 원문</p>
        <div className={s.kzDoc}>{detail.draftContent ? annotateAmounts(detail.draftContent) : "본문이 없습니다."}</div>
        {detail.stampUrl && <div className={s.kzStamp}><CheckCircle2 size={14} /> 변호사 전자직인 날인 완료</div>}

        <div className={s.kzModalFoot}>
          <span>접수 {fmtDate(detail.createdAt)}</span>
          <span>결제 {detail.totalPaid.toLocaleString()}원</span>
        </div>
      </div>
    </div>
  );
}

/** 마이페이지 — 내 내용증명 사건 목록·진행상황 */
export default function ProfileKeepzipPanel() {
  const { items, loading } = useKeepzipCases();
  const [detail, setDetail] = useState<KzDetail | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const openDetail = async (id: string) => {
    setOpening(id);
    const d = await fetchKeepzipDetail(id);
    setOpening(null);
    if (d) setDetail(d);
  };

  if (loading) {
    return <div className={s.emptyRow}>불러오는 중…</div>;
  }
  if (items.length === 0) {
    return (
      <div className={s.emptyBox}>
        <FileText size={30} strokeWidth={1.3} className={s.emptyIco} />
        <p className={s.emptyTitle}>진행 중인 내용증명이 없습니다</p>
        <p style={{ fontSize: 13, color: "#aab" }}>변호사에게 내용증명을 요청하면 여기에서 진행상황을 확인할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <>
      <p className={s.cardDesc} style={{ marginBottom: 16 }}>변호사에게 요청한 내용증명의 내용과 진행상황을 확인할 수 있습니다.</p>
      {items.map((c: KzListItem) => {
        const m = statusMeta(c.status);
        return (
          <button key={c.id} className={`${s.appCard} ${s.kzCard}`} onClick={() => openDetail(c.id)} disabled={opening === c.id}>
            <div className={s.appTop}>
              <div className={s.thumb}><FileText size={22} strokeWidth={1.4} className={s.kzIco} /></div>
              <div className={s.appTopInfo}>
                <div className={s.appTitle}>{causeLabel(c.cause)}</div>
                <div className={s.appSub}>{c.senderName} → {c.recipientName}</div>
              </div>
              <span className={`${s.statusPill} ${PILL[m.tone]}`}>{m.label}</span>
            </div>
            <div className={s.appFoot}>
              <span className={s.footDate}>접수 {fmtDate(c.createdAt)}</span>
              <span className={s.kzView}>{opening === c.id ? "여는 중…" : "내용·진행상황 보기 →"}</span>
            </div>
          </button>
        );
      })}
      {detail && <DetailModal detail={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
