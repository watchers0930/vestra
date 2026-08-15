"use client";

import Link from "next/link";
import s from "../listings-list-mobile.module.css";
import type { ListingItem } from "@/app/(app)/listings/hooks/useListings";

const PIMG = [s.pimg1, s.pimg2, s.pimg3, s.pimg4, s.pimg5, s.pimg6];

/** 원 단위 문자열(BigInt 직렬화) → "1.9억" / "3,200만" */
function formatPrice(won: string | null): string {
  const n = Number(won);
  if (!n) return "-";
  if (n >= 100000000) {
    const eok = n / 100000000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억`;
  }
  return `${Math.round(n / 10000).toLocaleString()}만`;
}

export default function MobileListingCard({ listing, index }: { listing: ListingItem; index: number }) {
  const isSale = listing.listingType === "SALE";
  const photo = listing.photos?.[0];

  return (
    <Link href={`/listings/${listing.id}`} className={s.propertyCard}>
      <div
        className={`${s.propImg} ${photo ? "" : PIMG[index % PIMG.length]}`}
        style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <span className={`${s.badgeType} ${isSale ? s.badgeSale : s.badgeJeonse}`}>{isSale ? "매매" : "전세"}</span>
        {listing.isCertified && <span className={s.badgeTrust}>안심인증</span>}
      </div>
      <div className={s.propBody}>
        <div className={s.propPrice}>
          {formatPrice(listing.deposit)}
          {!isSale && listing.duration ? <span className={s.months}>{listing.duration}개월</span> : null}
        </div>
        <div className={s.propAddr}>{listing.address}</div>
        <div className={s.propMeta}>
          {listing.roomType && <span className={s.mType}>{listing.roomType}</span>}
          {listing.size != null && <span className={s.mArea}>{listing.size}㎡</span>}
          {listing.floor != null && (
            <span className={s.mFloor}>{listing.floor}{listing.totalFloor ? `/${listing.totalFloor}` : ""}층</span>
          )}
        </div>
        <div className={s.propFooter}>
          <span className={s.propLikes}>{listing._count.applications}</span>
          <span>{listing.owner.companyName || listing.owner.name || "베스트라"}</span>
        </div>
      </div>
    </Link>
  );
}
