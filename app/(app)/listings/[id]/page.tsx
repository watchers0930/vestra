"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { ListingItem } from "../hooks/useListings";
import { ListingDetail } from "./components/ListingDetail";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<ListingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setListing(data); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ width: "100%", paddingTop: 40 }}>
        <div style={{ height: 300, borderRadius: 20, background: "#f5f5f7", marginBottom: 20 }} />
        <div style={{ height: 120, borderRadius: 20, background: "#f5f5f7", marginBottom: 12 }} />
        <div style={{ height: 60, borderRadius: 16, background: "#f5f5f7" }} />
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#aeaeb2" }}>
        <p style={{ fontSize: 16, fontWeight: 600 }}>매물을 찾을 수 없습니다</p>
      </div>
    );
  }

  return <ListingDetail listing={listing} />;
}
