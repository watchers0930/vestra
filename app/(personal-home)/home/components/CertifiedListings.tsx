"use client";

import Link from "next/link";
import { useListings } from "@/app/(app)/listings/hooks/useListings";
import { SAMPLE_INTERIOR_PHOTOS } from "@/lib/sample-photos";
import s from "../personal-home.module.css";

function formatPrice(val: string): string {
  const n = Number(val);
  if (!n) return "-";
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return `${eok % 1 === 0 ? eok : eok.toFixed(1)}억`;
  }
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만`;
  return `${n.toLocaleString()}원`;
}

// 매물검색의 실데이터(ACTIVE) 중 안심인증(isCertified) 매물만 홈 메인에 노출.
// 홈 카드 디자인(personal-home.module.css)은 그대로 유지하고 데이터만 동적 연결한다.
export default function CertifiedListings() {
  const { listings, loading } = useListings();
  const certified = listings.filter((l) => l.isCertified);

  if (loading) {
    return (
      <div className={s.listingsGrid}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={s.propertyCard} style={{ minHeight: 260, background: "#f5f5f7" }} />
        ))}
      </div>
    );
  }

  if (certified.length === 0) {
    return (
      <p style={{ textAlign: "center", color: "#6b7280", padding: "40px 0", fontSize: 14 }}>
        등록된 안심인증 매물이 없습니다.
      </p>
    );
  }

  return (
    <div className={s.listingsGrid}>
      {certified.map((l) => {
        const isJeonse = l.listingType === "JEONSE";
        const bg = l.photos?.[0] ?? SAMPLE_INTERIOR_PHOTOS[0];
        return (
          <Link key={l.id} href={`/renewal/listing-db-detail?id=${l.id}`} className={s.propertyCard}>
            <div
              className={s.propImg}
              style={{ backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <span className={`${s.badgeType} ${isJeonse ? s.badgeJeonse : s.badgeSale}`}>
                {isJeonse ? "전세" : "매매"}
              </span>
              <span className={s.badgeTrust}>안심매물</span>
            </div>
            <div className={s.propBody}>
              <div className={s.propPrice}>
                {formatPrice(l.deposit)}
                {isJeonse && l.duration ? <span className={s.months}>{l.duration}개월</span> : null}
              </div>
              <div className={s.propAddr}>{l.address}</div>
              <div className={s.propMeta}>
                {l.roomType && <span>{l.roomType}</span>}
                {l.size != null && <span>{l.size}㎡</span>}
                {l.floor != null && <span>{l.floor}층</span>}
                {l.totalFloor != null && <span>{l.totalFloor}층</span>}
              </div>
              <div className={s.propFooter}>
                <span>{l.viewCount ?? 0}</span>
                <span>{l.owner?.companyName || l.owner?.name || "중개사"}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
