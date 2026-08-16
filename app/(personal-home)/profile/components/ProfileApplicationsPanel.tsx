"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, FileText, MessageCircle, Trash2 } from "lucide-react";
import { useSentApplications, useReceivedApplications, type AppItem, type AppStatus, type ReceivedFilter } from "../hooks/useApplications";
import s from "../profile-renewal.module.css";

const STATUS_META: Record<AppStatus, { label: string; cls: string }> = {
  PENDING:   { label: "검토 중", cls: s.stPending },
  ACCEPTED:  { label: "수락됨", cls: s.stAccepted },
  REJECTED:  { label: "거절됨", cls: s.stRejected },
  WITHDRAWN: { label: "철회됨", cls: s.stWithdrawn },
};

function formatWon(val: string | null) {
  if (!val) return "-";
  const n = Number(val);
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(n % 100_000_000 === 0 ? 0 : 1)}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000).toLocaleString()}만`;
  return `${n.toLocaleString()}원`;
}
const fmtDate = (v: string) => new Date(v).toLocaleDateString("ko-KR");

/** 매물 요약 헤더 (썸네일 + 주소 + 매물보기) */
function AppHeader({ a }: { a: AppItem }) {
  const thumb = a.listing?.photos?.[0] ?? null;
  const ownerName = a.listing?.owner?.companyName ?? a.listing?.owner?.name ?? null;
  return (
    <div className={s.appTop}>
      <div className={s.thumb}>
        {thumb ? <img src={thumb} alt="" /> : <Building2 size={20} strokeWidth={1.2} className={s.thumbIco} />}
      </div>
      <div className={s.appTopInfo}>
        <p className={s.appTitle}>{a.listing?.address ?? "삭제된 매물"}</p>
        <p className={s.appSub}>
          {a.listing?.listingType === "JEONSE" ? "전세" : "매매"} {formatWon(a.listing?.deposit ?? null)}
          {ownerName && <> · {ownerName}</>}
        </p>
      </div>
      <Link href={`/renewal/listing-db-detail?id=${a.listingId}`} className={s.viewBtn}>매물 보기</Link>
    </div>
  );
}

/** 의향서 내용 그리드 */
function AppDetailGrid({ a, showApplicant }: { a: AppItem; showApplicant?: boolean }) {
  return (
    <div className={s.appGrid}>
      {showApplicant && (
        <div className={s.gCol}>
          <p className={s.gLabel}>신청인</p>
          <p className={s.gVal}>{a.applicant?.companyName ?? a.applicant?.name ?? "-"}</p>
        </div>
      )}
      <div className={s.gCol}>
        <p className={s.gLabel}>입주 희망일</p>
        <p className={s.gVal}>{fmtDate(a.moveInDate)}</p>
      </div>
      {a.duration != null && (
        <div className={s.gCol}>
          <p className={s.gLabel}>계약 기간</p>
          <p className={s.gVal}>{a.duration}개월</p>
        </div>
      )}
      {a.proposedDeposit && (
        <div className={s.gCol}>
          <p className={s.gLabel}>제안 금액</p>
          <p className={`${s.gVal} ${s.gAccent}`}>{formatWon(a.proposedDeposit)}</p>
        </div>
      )}
      {a.memo && (
        <div className={`${s.gCol} ${s.gWide}`}>
          <p className={s.gLabel}>메모</p>
          <p className={s.gMemo}>{a.memo}</p>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className={s.emptyBox}>
      <div className={s.emptyIco}>{icon}</div>
      <p className={s.emptyTitle}>{title}</p>
      {action}
    </div>
  );
}

function CardSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={s.skel} style={{ height: 130, marginBottom: 12 }} />
      ))}
    </>
  );
}

/* ===== 보낸 의향서 ===== */
function SentList() {
  const { items: sent, loading: sentLoading, busyId, withdraw, remove } = useSentApplications();
  if (sentLoading) return <CardSkeleton />;
  if (sent.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={36} strokeWidth={1.2} />}
        title="보낸 의향서가 없습니다"
        action={<Link href="/renewal/listings-list" className={s.emptyBtn}>매물 둘러보기</Link>}
      />
    );
  }
  return (
    <>
      <p className={s.panelCount} style={{ marginBottom: 14 }}>총 {sent.length}건</p>
      {sent.map((a) => {
        const st = STATUS_META[a.status];
        return (
          <div key={a.id} className={s.appCard}>
            <AppHeader a={a} />
            <AppDetailGrid a={a} />
            {a.status === "REJECTED" && a.rejectionReason && (
              <div className={`${s.noteBox} ${s.noteReject}`}>
                <p className={s.noteLabel}>거절 사유</p>
                {a.rejectionReason}
              </div>
            )}
            {a.status === "ACCEPTED" && (
              <div className={`${s.noteBox} ${s.noteAccept}`}>
                임대인이 의향서를 수락했습니다. 계약 진행을 협의해보세요.
              </div>
            )}
            <div className={s.appFoot}>
              <span className={`${s.statusPill} ${st.cls}`}>{st.label}</span>
              <div className={s.footActs}>
                <span className={s.footDate}>{fmtDate(a.createdAt)}</span>
                <Link href={`/chat/${a.id}`} className={s.actBtn}><MessageCircle size={13} strokeWidth={2} />채팅</Link>
                {a.status === "PENDING" && (
                  <button className={s.actBtn} disabled={busyId === a.id} onClick={() => withdraw(a.id)}>
                    {busyId === a.id ? "처리 중..." : "철회"}
                  </button>
                )}
                {a.status === "WITHDRAWN" && (
                  <button className={`${s.actBtn} ${s.actDanger}`} disabled={busyId === a.id} onClick={() => remove(a.id)}>
                    <Trash2 size={12} strokeWidth={2} />{busyId === a.id ? "삭제 중..." : "삭제"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ===== 받은 의향서 ===== */
const RECEIVED_FILTERS: { value: ReceivedFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "검토 중" },
  { value: "ACCEPTED", label: "수락됨" },
  { value: "REJECTED", label: "거절됨" },
];

function ReceivedList() {
  const { items: received, loading: receivedLoading, filter, setFilter, busyId, decide, remove } = useReceivedApplications();
  return (
    <>
      <div className={s.subTabs}>
        {RECEIVED_FILTERS.map(({ value, label }) => (
          <button key={value} className={`${s.tabBtn} ${filter === value ? s.on : ""}`} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
      </div>
      {receivedLoading ? (
        <CardSkeleton />
      ) : received.length === 0 ? (
        <EmptyState icon={<FileText size={36} strokeWidth={1.2} />} title="받은 의향서가 없습니다" />
      ) : (
        received.map((a) => {
          const st = STATUS_META[a.status];
          return (
            <div key={a.id} className={s.appCard}>
              <AppHeader a={a} />
              <AppDetailGrid a={a} showApplicant />
              <div className={s.appFoot}>
                <span className={`${s.statusPill} ${st.cls}`}>{st.label}</span>
                <div className={s.footActs}>
                  <span className={s.footDate}>{fmtDate(a.createdAt)}</span>
                  <Link href={`/chat/${a.id}`} className={s.actBtn}><MessageCircle size={13} strokeWidth={2} />채팅</Link>
                  {a.status === "PENDING" && (
                    <>
                      <button className={`${s.actBtn} ${s.actDanger}`} disabled={busyId === a.id} onClick={() => decide(a.id, "REJECTED")}>거절</button>
                      <button className={`${s.actBtn} ${s.actAccept}`} disabled={busyId === a.id} onClick={() => decide(a.id, "ACCEPTED")}>
                        {busyId === a.id ? "처리 중..." : "수락"}
                      </button>
                    </>
                  )}
                  {(a.status === "REJECTED" || a.status === "WITHDRAWN") && (
                    <button className={`${s.actBtn} ${s.actDanger}`} disabled={busyId === a.id} onClick={() => remove(a.id)}>
                      <Trash2 size={12} strokeWidth={2} />삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

export default function ProfileApplicationsPanel() {
  const [view, setView] = useState<"sent" | "received">("sent");
  return (
    <div>
      <div className={s.subTabs}>
        <button className={`${s.tabBtn} ${view === "sent" ? s.on : ""}`} onClick={() => setView("sent")}>보낸 의향서</button>
        <button className={`${s.tabBtn} ${view === "received" ? s.on : ""}`} onClick={() => setView("received")}>받은 의향서</button>
      </div>
      {view === "sent" ? <SentList /> : <ReceivedList />}
    </div>
  );
}
