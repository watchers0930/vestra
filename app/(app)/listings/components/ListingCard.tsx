"use client";

import Link from "next/link";
import { Building2, AreaChart, Layers, Calendar, Eye, FileCheck2, ShieldCheck } from "lucide-react";
import type { ListingItem } from "../hooks/useListings";

function formatWon(val: string | null) {
  if (!val) return "-";
  const n = Number(val);
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(n % 100_000_000 === 0 ? 0 : 1)}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만`;
  return `${n.toLocaleString()}원`;
}

const TYPE_LABEL: Record<string, string> = { JEONSE: "전세", SALE: "매매" };
const TYPE_COLOR: Record<string, string> = {
  JEONSE: "bg-blue-50 text-blue-700",
  SALE:   "bg-violet-50 text-violet-700",
};

interface Props { listing: ListingItem; }

export function ListingCard({ listing }: Props) {
  const thumb = listing.photos?.[0] ?? null;

  return (
    <Link href={`/listings/${listing.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          transition: "all 0.15s",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(0,0,0,0.10)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* 썸네일 */}
        <div style={{ width: "100%", height: "160px", background: "#f5f5f7", position: "relative", overflow: "hidden" }}>
          {thumb ? (
            <img src={thumb} alt="매물 사진" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={36} strokeWidth={1.2} style={{ color: "#c7c7cc" }} />
            </div>
          )}
          <span
            style={{ position: "absolute", top: 10, left: 10 }}
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLOR[listing.listingType]}`}
          >
            {TYPE_LABEL[listing.listingType]}
          </span>

          {/* 안전인증 뱃지 */}
          {listing.isCertified && (
            <span style={{
              position: "absolute", bottom: 10, left: 10,
              background: "linear-gradient(135deg, #1a7f4b 0%, #22a75e 100%)",
              color: "#fff", borderRadius: "100px", padding: "4px 10px",
              fontSize: "11px", fontWeight: 800,
              display: "flex", alignItems: "center", gap: 4,
              boxShadow: "0 2px 8px rgba(26,127,75,0.35)",
              letterSpacing: "-0.01em",
            }}>
              <ShieldCheck size={12} strokeWidth={2.5} />
              안전인증
            </span>
          )}

          {listing.analysisId && (
            <span
              style={{
                position: "absolute", top: 10, right: 10,
                background: "rgba(48,209,88,0.12)", color: "#1a9e45",
                borderRadius: "100px", padding: "2px 8px",
                fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", gap: 3,
              }}
            >
              <FileCheck2 size={10} strokeWidth={2} />AI분석 첨부
            </span>
          )}
        </div>

        {/* 정보 */}
        <div style={{ padding: "16px" }}>
          <p style={{ fontSize: "18px", fontWeight: 800, color: "#1d1d1f", marginBottom: 4, letterSpacing: "-0.02em" }}>
            {formatWon(listing.deposit)}
            {listing.listingType === "JEONSE" && listing.duration && (
              <span style={{ fontSize: "12px", fontWeight: 500, color: "#6e6e73", marginLeft: 6 }}>
                {listing.duration}개월
              </span>
            )}
          </p>
          <p style={{ fontSize: "13px", color: "#6e6e73", marginBottom: 10, lineHeight: 1.4 }}>
            {listing.address}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            {listing.roomType && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "12px", color: "#aeaeb2" }}>
                <Building2 size={11} strokeWidth={1.5} />{listing.roomType}
              </span>
            )}
            {listing.size && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "12px", color: "#aeaeb2" }}>
                <AreaChart size={11} strokeWidth={1.5} />{listing.size}㎡
              </span>
            )}
            {listing.floor && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "12px", color: "#aeaeb2" }}>
                <Layers size={11} strokeWidth={1.5} />{listing.floor}층
              </span>
            )}
            {listing.availableFrom && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "12px", color: "#aeaeb2" }}>
                <Calendar size={11} strokeWidth={1.5} />
                {new Date(listing.availableFrom).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 입주
              </span>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#aeaeb2", display: "flex", alignItems: "center", gap: 3 }}>
              <Eye size={10} strokeWidth={1.5} />{listing.viewCount}
            </span>
            <span style={{ fontSize: "11px", color: "#aeaeb2" }}>
              {listing.owner.companyName ?? listing.owner.name ?? ""}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
