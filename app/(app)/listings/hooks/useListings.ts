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
  totalFloor: number | null;
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
  /** 등록임대주택(임대사업자) 부기등기 — 임대료 증액제한·의무기간 보호 신호 */
  isRentalBusiness?: boolean;
  /** 등기명의인표시변경 부기등기 — 소유자 동일성 확인 필요 */
  hasNameChange?: boolean;
  taxDocUrl: string | null;
  taxDocFilename: string | null;
  buildingDocUrl: string | null;
  insuranceResult: { hugEligible: boolean; sgiEligible: boolean; hfEligible: boolean; recommendation: string } | null;
  status: ListingStatus;
  viewCount: number;
  analysisId: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  owner: { id: string; name: string | null; role: string; companyName: string | null };
  _count: { applications: number };
}

export interface ListingExtraFilters {
  roomType?: string;
  minSize?: number;
  maxSize?: number;
  region?: string;
}

export function useListings(listingType?: ListingType, extra?: ListingExtraFilters) {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      if (listingType) params.set("listingType", listingType);
      if (extra?.roomType) params.set("roomType", extra.roomType);
      if (extra?.minSize)  params.set("minSize",  String(extra.minSize));
      if (extra?.maxSize)  params.set("maxSize",  String(extra.maxSize));
      if (extra?.region)   params.set("region",   extra.region);
      const res = await fetch(`/api/listings?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setListings(data.listings);
      setTotal(data.total);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [listingType, extra?.roomType, extra?.minSize, extra?.maxSize, extra?.region]);

  useEffect(() => { load(1); }, [load]);

  return { listings, total, loading, page, setPage, reload: load };
}
