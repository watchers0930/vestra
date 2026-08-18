"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MapMarker } from "@/app/(app)/listings/components/KakaoMarkersMap";
import type { ListingSlideData } from "@/app/(app)/listings/components/MapSlidePanelInfo";
import {
  SAMPLE_PHOTOS,
  FILTER_DEFAULTS,
  SIGUNGU_MAP,
  type Apt,
  type FilterKey,
} from "../constants";
import { formatEok, formatKoreanWon } from "../lib/format";

export function useListingsMap() {
  // Dropdown filter
  const [openDropdown, setOpenDropdown] = useState<FilterKey | null>(null);
  const [filterLabels, setFilterLabels] = useState<Record<FilterKey, string>>({
    type: "건물유형",
    trade: "거래유형",
    size: "전체 평형",
  });
  const [filterActive, setFilterActive] = useState<Record<FilterKey, boolean>>({
    type: false,
    trade: false,
    size: false,
  });
  const [selectedOpts, setSelectedOpts] = useState<Record<FilterKey, string>>({
    type: "건물유형 (전체)",
    trade: "거래유형 (전체)",
    size: "전체 평형",
  });

  // Location selects
  const [sido, setSido] = useState("서울특별시");
  const [sigunguList, setSigunguList] = useState([
    "강남구",
    "서초구",
    "송파구",
    "강동구",
  ]);
  const [sigungu, setSigungu] = useState("강남구");

  const router = useRouter();
  const searchParams = useSearchParams();
  const region = sigungu || "강남구";
  const focusApt = searchParams.get("apt");

  // 진입 쿼리(region)로 시군구 초기화 (이후 select로 변경 가능)
  const regionInitRef = useRef(false);
  useEffect(() => {
    if (regionInitRef.current) return;
    regionInitRef.current = true;
    const r = searchParams.get("region");
    if (r && r !== sigungu) setSigungu(r);
  }, [searchParams, sigungu]);

  // 지역 아파트 실거래 (지오코딩 포함)
  const [items, setItems] = useState<Apt[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const loadItems = useCallback(async (regionName: string) => {
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/listings/apartments?region=${encodeURIComponent(regionName)}&limit=60&geocode=1`);
      const data = res.ok ? await res.json() : { items: [] };
      setItems(data.items ?? []);
    } catch { setItems([]); }
    finally { setLoadingItems(false); }
  }, []);
  useEffect(() => { loadItems(region); }, [region, loadItems]);

  // Detail panel
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<number | null>(null);

  // 앱 MapSlidePanel 형식용 데이터
  const curApt = activeItem != null ? items[activeItem] : null;
  const slideData: ListingSlideData | null = curApt ? {
    id: "molit",
    listingType: "SALE",
    address: `${region} ${curApt.dong} ${curApt.aptName}`,
    roomType: "아파트",
    size: curApt.area,
    floor: curApt.floor,
    totalFloor: null,
    deposit: String(curApt.dealAmount),
    managementFee: null,
    duration: null,
    photos: [
      SAMPLE_PHOTOS[activeItem! % SAMPLE_PHOTOS.length],
      SAMPLE_PHOTOS[(activeItem! + 1) % SAMPLE_PHOTOS.length],
      SAMPLE_PHOTOS[(activeItem! + 2) % SAMPLE_PHOTOS.length],
    ],
    description: `${region} ${curApt.dong} ${curApt.aptName} · ${curApt.dealDate} 실거래 ${formatKoreanWon(curApt.dealAmount)} · 국토교통부 공개데이터 기반 (사진은 예시)`,
    // 국토부 실거래 공개데이터는 VESTRA 안심인증 대상이 아니므로 false (오인 방지)
    isCertified: false,
    jeonseRatio: null,
    officialPrice: null,
    latitude: curApt.lat ?? null,
    longitude: curApt.lng ?? null,
    availableFrom: null,
    owner: { id: "", name: "국토부 실거래", companyName: null },
  } : null;

  // 마커
  const markers = useMemo<MapMarker[]>(
    () => items
      .filter((a) => a.lat != null && a.lng != null)
      .map((a) => ({ id: String(items.indexOf(a)), lat: a.lat!, lng: a.lng!, label: formatEok(a.dealAmount) })),
    [items],
  );
  const [panTo, setPanTo] = useState<{ lat: number; lng: number } | null>(null);

  // focus 파라미터로 진입 시 해당 물건 상세 자동 오픈
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current || !focusApt || items.length === 0) return;
    const idx = items.findIndex((a) => a.aptName === focusApt);
    if (idx >= 0) {
      autoOpenedRef.current = true;
      setActiveItem(idx);
      setDetailOpen(true);
      if (items[idx].lat != null) setPanTo({ lat: items[idx].lat!, lng: items[idx].lng! });
    }
  }, [focusApt, items]);

  // Close dropdown when clicking outside
  const filterRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        filterRowRef.current &&
        !filterRowRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  const toggleDropdown = (key: FilterKey) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const selectOption = (key: FilterKey, value: string) => {
    const isDefault =
      value === FILTER_DEFAULTS[key] ||
      value === `${FILTER_DEFAULTS[key]} (전체)`;
    setFilterLabels((prev) => ({ ...prev, [key]: value.replace(" (전체)", "") === FILTER_DEFAULTS[key] ? FILTER_DEFAULTS[key] : value }));
    setFilterActive((prev) => ({ ...prev, [key]: !isDefault }));
    setSelectedOpts((prev) => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
  };

  const updateSigungu = (value: string) => {
    setSido(value);
    const list = SIGUNGU_MAP[value] || [];
    setSigunguList(list);
    setSigungu(list[0] || "");
  };

  const openDetail = (idx: number) => {
    setActiveItem(idx);
    setDetailOpen(true);
    const a = items[idx];
    if (a?.lat != null) setPanTo({ lat: a.lat, lng: a.lng! });
  };

  // 상세 페이지로 이동 (계약의향서/상세보기)
  const goToDetail = () => {
    if (activeItem == null || !items[activeItem]) return;
    const a = items[activeItem];
    const q = new URLSearchParams({
      region, apt: a.aptName, dong: a.dong,
      area: String(a.area), floor: String(a.floor),
      amount: String(a.dealAmount), dealDate: a.dealDate,
      buildYear: String(a.buildYear),
    });
    if (a.lat != null) { q.set("lat", String(a.lat)); q.set("lng", String(a.lng)); }
    router.push(`/renewal/listing-detail?${q.toString()}`);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setActiveItem(null);
  };

  return {
    // 필터 상태
    openDropdown, filterLabels, filterActive, selectedOpts,
    toggleDropdown, selectOption, filterRowRef,
    // 지역 상태
    sido, sigungu, sigunguList, updateSigungu, setSigungu,
    // 목록/마커
    region, items, loadingItems, markers,
    // 상세 패널
    detailOpen, activeItem, slideData, panTo,
    openDetail, goToDetail, closeDetail,
  };
}
