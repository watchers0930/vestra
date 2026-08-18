"use client";

import Link from "next/link";
import type { ListingItem } from "../hooks/useListings";

function formatWon(val: string | null) {
  if (!val) return "-";
  const n = Number(val);
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(n % 100_000_000 === 0 ? 0 : 1)}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만`;
  return `${n.toLocaleString()}원`;
}

function formatAvailableFrom(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 입주`;
}

const META_ICONS = {
  type: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#c0c4d0" strokeWidth="1.2">
      <polyline points="1,5 5,1 9,5"/>
      <rect x="2" y="5" width="6" height="4" rx="0.5"/>
    </svg>
  ),
  area: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#c0c4d0" strokeWidth="1.2">
      <rect x="1" y="1" width="8" height="8" rx="0.5"/>
      <line x1="3" y1="1" x2="3" y2="9"/>
    </svg>
  ),
  floor: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#c0c4d0" strokeWidth="1.2">
      <rect x="1" y="1" width="8" height="3" rx="0.5"/>
      <rect x="1" y="6" width="8" height="3" rx="0.5"/>
    </svg>
  ),
  date: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#c0c4d0" strokeWidth="1.2">
      <rect x="1" y="2" width="8" height="7" rx="0.5"/>
      <line x1="1" y1="5" x2="9" y2="5"/>
      <line x1="3.5" y1="1" x2="3.5" y2="3.5"/>
      <line x1="6.5" y1="1" x2="6.5" y2="3.5"/>
    </svg>
  ),
};

type MetaKey = keyof typeof META_ICONS;

// 소유자 등급 → 매물 출처 라벨 (실데이터 owner.role 기반)
const OWNER_ROLE_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  REALESTATE: { text: "중개사", color: "#2563eb", bg: "#e0edff" },
  RENTAL_BIZ: { text: "임대사업자", color: "#15803d", bg: "#dcfce7" },
  BUSINESS: { text: "기업", color: "#7c3aed", bg: "#ede9fe" },
};

interface Props { listing: ListingItem; forceCertified?: boolean; href?: string; }

export function ListingCard({ listing, forceCertified, href }: Props) {
  const thumb = listing.photos?.[0] ?? null;
  const showCertified = listing.isCertified || forceCertified;

  const metaItems: { key: MetaKey; value: string }[] = [
    listing.roomType ? { key: "type" as MetaKey, value: listing.roomType } : null,
    listing.size ? { key: "area" as MetaKey, value: `${listing.size}㎡` } : null,
    listing.floor ? { key: "floor" as MetaKey, value: listing.totalFloor ? `${listing.floor}/${listing.totalFloor}층` : `${listing.floor}층` } : null,
    listing.availableFrom ? { key: "date" as MetaKey, value: formatAvailableFrom(listing.availableFrom) } : null,
  ].filter(Boolean) as { key: MetaKey; value: string }[];

  return (
    <Link href={href ?? `/listings/${listing.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{ border: "1px solid #e8eaf2", borderRadius: 10, overflow: "hidden", transition: "box-shadow 0.18s", cursor: "pointer", background: "#fff" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
      >
        {/* Image */}
        <div style={{ height: 178, position: "relative", overflow: "hidden", background: "#f0f2f6" }}>
          {thumb && (
            <img src={thumb} alt="매물 사진" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}

          {/* Type badge */}
          <span style={{
            position: "absolute", top: 10, left: 10,
            padding: "3px 9px", borderRadius: 4, fontSize: 12, fontWeight: 600, color: "#fff",
            background: listing.listingType === "JEONSE" ? "#2e4bd8" : "#e04444",
          }}>
            {listing.listingType === "JEONSE" ? "전세" : "매매"}
          </span>

          {/* Trust badge */}
          {showCertified && (
            <span style={{
              position: "absolute", top: 10, right: 10,
              background: "#22c55e", color: "#fff",
              fontSize: 12, fontWeight: 500, padding: "3px 9px", borderRadius: 12,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              안심인증
            </span>
          )}

          {/* 등록임대주택 배지 (임대사업자 부기등기) */}
          {listing.isRentalBusiness && (
            <span style={{
              position: "absolute", top: showCertified ? 40 : 10, right: 10,
              background: "#15803d", color: "#fff",
              fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 12,
            }}>
              등록임대주택
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "14px 16px 16px" }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#1a1d2e", marginBottom: 2 }}>
            {formatWon(listing.deposit)}
            {listing.listingType === "JEONSE" && listing.duration && (
              <span style={{ fontSize: 12, fontWeight: 400, color: "#999", marginLeft: 4 }}>
                {listing.duration}개월
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#444", marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {listing.address}
          </div>

          {/* Meta */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", fontSize: 12, color: "#b0b4c0" }}>
            {metaItems.map((item, i) => (
              <span key={item.key} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && <span style={{ margin: "0 5px", color: "#d8dae0" }}>|</span>}
                <span style={{ display: "flex", alignItems: "center", paddingLeft: 14, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, display: "flex", alignItems: "center" }}>
                    {META_ICONS[item.key]}
                  </span>
                  {item.value}
                </span>
              </span>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f2f6", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#c8cad4" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#c8cad4" strokeWidth="1.4">
                <path d="M6 10C6 10 1 7 1 4a2.5 2.5 0 0 1 5-1 2.5 2.5 0 0 1 5 1C11 7 6 10 6 10Z"/>
              </svg>
              {listing.viewCount}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {OWNER_ROLE_LABEL[listing.owner.role] && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                  color: OWNER_ROLE_LABEL[listing.owner.role].color,
                  background: OWNER_ROLE_LABEL[listing.owner.role].bg,
                }}>
                  {OWNER_ROLE_LABEL[listing.owner.role].text}
                </span>
              )}
              {listing.owner.companyName ?? listing.owner.name ?? ""}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
