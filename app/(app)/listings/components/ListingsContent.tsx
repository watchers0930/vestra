"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { useListings, type ListingType } from "../hooks/useListings";
import { ListingCard } from "./ListingCard";
import { useSession } from "next-auth/react";

const TYPES: { value: ListingType | "ALL"; label: string }[] = [
  { value: "ALL",    label: "전체" },
  { value: "JEONSE", label: "전세" },
  { value: "SALE",   label: "매매" },
];

export function ListingsContent() {
  const { data: session } = useSession();
  const [typeFilter, setTypeFilter] = useState<ListingType | "ALL">("ALL");
  const { listings, total, loading } = useListings(typeFilter === "ALL" ? undefined : typeFilter);

  return (
    <div style={{ paddingBottom: 48, paddingTop: 8 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#1d1d1f" }}>매물 목록</h1>
          <p style={{ fontSize: 13, color: "#6e6e73", marginTop: 4 }}>
            총 {total}개 매물
          </p>
        </div>
        {session && (
          <Link href="/listings/new" style={{ textDecoration: "none" }}>
            <button
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 16px", borderRadius: 12,
                background: "#0071e3", color: "#fff",
                fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
              }}
            >
              <Plus size={15} strokeWidth={2} />매물 등록
            </button>
          </Link>
        )}
      </div>

      {/* 필터 탭 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTypeFilter(value)}
            style={{
              padding: "7px 16px", borderRadius: 100,
              fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
              background: typeFilter === value ? "#0071e3" : "#f5f5f7",
              color: typeFilter === value ? "#fff" : "#3d3d3f",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 280, borderRadius: 18, background: "#f5f5f7", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#aeaeb2" }}>
          <SlidersHorizontal size={36} strokeWidth={1.2} style={{ marginBottom: 12, color: "#c7c7cc" }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>등록된 매물이 없습니다</p>
          <p style={{ fontSize: 13 }}>첫 번째 매물을 등록해보세요</p>
          {session && (
            <Link href="/listings/new" style={{ textDecoration: "none" }}>
              <button
                style={{
                  marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "9px 18px", borderRadius: 12, background: "#0071e3",
                  color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                }}
              >
                <Plus size={14} strokeWidth={2} />매물 등록
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
