"use client";

import { useState, useEffect, useCallback } from "react";

export type ListingType = "JEONSE" | "SALE";
export type ListingStatus = "ACTIVE" | "HIDDEN" | "CONTRACTED" | "COMPLETED";

export interface ListingItem {
  id: string;
  listingType: ListingType;
  address: string;
  roomType: string | null;
  size: number | null;
  floor: number | null;
  deposit: string;
  managementFee: string | null;
  duration: number | null;
  availableFrom: string | null;
  photos: string[] | null;
  description: string | null;
  safetyDocuments: { type: string; url: string; filename: string }[] | null;
  officialPrice: string | null;
  jeonseRatio: number | null;
  isCertified: boolean;
  certifiedAt: string | null;
  taxDocUrl: string | null;
  taxDocFilename: string | null;
  buildingDocUrl: string | null;
  insuranceResult: { hugEligible: boolean; sgiEligible: boolean; hfEligible: boolean; recommendation: string } | null;
  status: ListingStatus;
  viewCount: number;
  analysisId: string | null;
  createdAt: string;
  owner: { id: string; name: string | null; role: string; companyName: string | null };
  _count: { applications: number };
}

export function useListings(listingType?: ListingType) {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "12" });
      if (listingType) params.set("listingType", listingType);
      const res = await fetch(`/api/listings?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setListings(data.listings);
      setTotal(data.total);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [listingType]);

  useEffect(() => { load(1); }, [load]);

  return { listings, total, loading, page, setPage, reload: load };
}
