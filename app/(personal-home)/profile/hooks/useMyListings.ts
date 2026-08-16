"use client";

import { useState, useEffect } from "react";
import type { ListingItem } from "@/app/(app)/listings/hooks/useListings";

/**
 * 마이페이지 내 매물 탭 데이터·액션.
 * - 목록: GET /api/listings?mine=true&limit=50
 * - 상태 변경: PATCH /api/listings/[id]
 * - 삭제: DELETE /api/listings/[id]
 */
export function useMyListings() {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/listings?mine=true&limit=50");
      if (res.ok) setListings((await res.json()).listings ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("이 매물을 삭제하시겠습니까? 복구할 수 없습니다.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (res.ok) setListings((prev) => prev.filter((l) => l.id !== id));
      else alert("삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  async function changeStatus(id: string, status: string) {
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

  return { listings, loading, deletingId, updatingId, remove, changeStatus };
}
