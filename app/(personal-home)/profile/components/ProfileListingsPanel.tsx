"use client";

import Link from "next/link";
import { Plus, Building2, Eye, ChevronDown } from "lucide-react";
import { useMyListings } from "../hooks/useMyListings";
import type { ListingItem } from "@/app/(app)/listings/hooks/useListings";
import s from "../profile-renewal.module.css";

function formatWon(val: string | null) {
  if (!val) return "-";
  const n = Number(val);
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(n % 100_000_000 === 0 ? 0 : 1)}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000).toLocaleString()}만`;
  return `${n.toLocaleString()}원`;
}

const TYPE_LABEL: Record<string, string> = { JEONSE: "전세", SALE: "매매" };
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "거래중", HIDDEN: "숨김", CONTRACTED: "계약완료", COMPLETED: "거래완료",
};
const STATUS_CLS: Record<string, string> = {
  ACTIVE: s.lsActive, HIDDEN: s.lsHidden, CONTRACTED: s.lsContracted, COMPLETED: s.lsCompleted,
};
const STATUS_OPTIONS = ["ACTIVE", "HIDDEN", "CONTRACTED", "COMPLETED"] as const;

export default function ProfileListingsPanel() {
  const { listings, loading, deletingId, updatingId, remove, changeStatus } = useMyListings();

  return (
    <div>
      <div className={s.panelHead}>
        <span className={s.panelCount}>총 {listings.length}건</span>
        <Link href="/renewal/listing-new" className={s.emptyBtn} style={{ marginTop: 0 }}>
          <Plus size={15} strokeWidth={2} />매물 등록
        </Link>
      </div>

      {loading ? (
        <>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={s.skel} style={{ height: 90, marginBottom: 10 }} />
          ))}
        </>
      ) : listings.length === 0 ? (
        <div className={s.emptyBox}>
          <div className={s.emptyIco}><Building2 size={36} strokeWidth={1.2} /></div>
          <p className={s.emptyTitle}>등록한 매물이 없습니다</p>
          <Link href="/renewal/listing-new" className={s.emptyBtn}>
            <Plus size={14} strokeWidth={2} />첫 매물 등록
          </Link>
        </div>
      ) : (
        listings.map((l: ListingItem) => {
          const thumb = l.photos?.[0] ?? null;
          return (
            <div key={l.id} className={s.lstCard}>
              <div className={s.lstThumb}>
                {thumb ? <img src={thumb} alt="" /> : <Building2 size={24} strokeWidth={1.2} className={s.thumbIco} />}
              </div>

              <div className={s.lstInfo}>
                <div className={s.lstTags}>
                  <span className={s.lstType}>{TYPE_LABEL[l.listingType]}</span>
                  <span className={`${s.lstStatus} ${STATUS_CLS[l.status] ?? ""}`}>{STATUS_LABEL[l.status]}</span>
                </div>
                <p className={s.lstPrice}>{formatWon(l.deposit)}</p>
                <p className={s.lstAddr}>{l.address}</p>
                <div className={s.lstMetaRow}>
                  <span className={s.lstMeta}><Eye size={10} strokeWidth={1.5} />{l.viewCount}</span>
                  <span>의향서 {l._count?.applications ?? 0}건</span>
                </div>
              </div>

              <div className={s.lstActs}>
                <div className={s.selWrap}>
                  <select
                    className={s.statusSel}
                    value={l.status}
                    disabled={updatingId === l.id}
                    onChange={(e) => changeStatus(l.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((v) => <option key={v} value={v}>{STATUS_LABEL[v]}</option>)}
                  </select>
                  <ChevronDown size={11} strokeWidth={2} className={s.selIco} />
                </div>
                <div className={s.lstBtnRow}>
                  <Link href={`/renewal/listing-db-detail?id=${l.id}`} className={s.actBtn}>보기</Link>
                  <button
                    className={`${s.actBtn} ${s.actDanger}`}
                    disabled={deletingId === l.id}
                    onClick={() => remove(l.id)}
                  >
                    {deletingId === l.id ? "..." : "삭제"}
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
