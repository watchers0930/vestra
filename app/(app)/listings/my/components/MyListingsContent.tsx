"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Building2, Edit2, Trash2, Eye, ChevronDown } from "lucide-react";
import type { ListingItem } from "../../hooks/useListings";

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
const STATUS_CHIP_STYLE: Record<string, React.CSSProperties> = {
  ACTIVE:     { background: "rgba(52,199,89,0.12)",  color: "#1a9e45" },
  HIDDEN:     { background: "#f5f5f7",               color: "#6e6e73" },
  CONTRACTED: { background: "rgba(0,113,227,0.1)",   color: "#0071e3" },
  COMPLETED:  { background: "rgba(0,0,0,0.06)",      color: "#3d3d3f" },
};

const STATUS_OPTIONS = ["ACTIVE", "HIDDEN", "CONTRACTED", "COMPLETED"] as const;

export function MyListingsContent() {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/listings?mine=true&limit=50");
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("이 매물을 삭제하시겠습니까?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (res.ok) setListings((prev) => prev.filter((l) => l.id !== id));
      else alert("삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setListings((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: status as ListingItem["status"] } : l))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div style={{ paddingBottom: 48, paddingTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#1d1d1f" }}>내 매물</h1>
          <p style={{ fontSize: 13, color: "#6e6e73", marginTop: 4 }}>총 {listings.length}건</p>
        </div>
        <Link href="/listings/new" style={{ textDecoration: "none" }}>
          <button
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 12, background: "#0071e3",
              color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
            }}
          >
            <Plus size={15} strokeWidth={2} />매물 등록
          </button>
        </Link>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 90, borderRadius: 16, background: "#f5f5f7" }} />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#aeaeb2" }}>
          <Building2 size={36} strokeWidth={1.2} style={{ marginBottom: 12, color: "#c7c7cc" }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>등록한 매물이 없습니다</p>
          <Link href="/listings/new" style={{ textDecoration: "none" }}>
            <button
              style={{
                marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 12, background: "#0071e3",
                color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
              }}
            >
              <Plus size={14} strokeWidth={2} />첫 매물 등록
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {listings.map((l) => {
            const thumb = l.photos?.[0] ?? null;
            const statusStyle = STATUS_CHIP_STYLE[l.status] ?? {};
            return (
              <div
                key={l.id}
                style={{
                  background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 16, padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 14,
                }}
              >
                {/* 썸네일 */}
                <div
                  style={{
                    width: 64, height: 64, borderRadius: 12, flexShrink: 0,
                    background: "#f5f5f7", overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {thumb
                    ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Building2 size={24} strokeWidth={1.2} style={{ color: "#c7c7cc" }} />
                  }
                </div>

                {/* 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#0071e3" }}>
                      {TYPE_LABEL[l.listingType]}
                    </span>
                    <span
                      style={{
                        fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 100,
                        ...statusStyle,
                      }}
                    >
                      {STATUS_LABEL[l.status]}
                    </span>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: "#1d1d1f", marginBottom: 2 }}>
                    {formatWon(l.deposit)}
                  </p>
                  <p style={{ fontSize: 12, color: "#6e6e73", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.address}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#aeaeb2" }}>
                      <Eye size={10} strokeWidth={1.5} />{l.viewCount}
                    </span>
                    <span style={{ fontSize: 11, color: "#aeaeb2" }}>
                      의향서 {l._count.applications}건
                    </span>
                  </div>
                </div>

                {/* 상태 변경 + 액션 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <div style={{ position: "relative" }}>
                    <select
                      value={l.status}
                      disabled={updatingId === l.id}
                      onChange={(e) => handleStatusChange(l.id, e.target.value)}
                      style={{
                        appearance: "none", border: "1px solid #d2d2d7", borderRadius: 8,
                        padding: "5px 24px 5px 8px", fontSize: 11, fontWeight: 600,
                        color: "#3d3d3f", background: "#f5f5f7", cursor: "pointer",
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                    <ChevronDown
                      size={11}
                      strokeWidth={2}
                      style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", color: "#6e6e73", pointerEvents: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Link href={`/listings/${l.id}`} style={{ textDecoration: "none" }}>
                      <button
                        style={{
                          padding: "5px 10px", borderRadius: 8, border: "1px solid #d2d2d7",
                          background: "#fff", fontSize: 11, fontWeight: 600, color: "#3d3d3f", cursor: "pointer",
                        }}
                      >
                        보기
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(l.id)}
                      disabled={deletingId === l.id}
                      style={{
                        padding: "5px 10px", borderRadius: 8,
                        border: "1px solid rgba(255,59,48,0.25)",
                        background: "rgba(255,59,48,0.05)", fontSize: 11, fontWeight: 600,
                        color: "#c0392b", cursor: "pointer",
                      }}
                    >
                      {deletingId === l.id ? "..." : "삭제"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
