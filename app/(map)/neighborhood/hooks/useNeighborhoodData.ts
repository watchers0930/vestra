"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface FacilityItem {
  name: string;
  distance: number;
  lat: number;
  lng: number;
  address: string;
}

export interface CategoryData {
  score: number;
  grade: string;
  count: number;
  nearest: number;
  items: FacilityItem[];
}

export interface FacilityGroup {
  label: string;
  category: string;
  color: string;
  count: number;
  items: FacilityItem[];
}

export interface AnalysisResult {
  address: string;
  lat: number;
  lng: number;
  categories: {
    transport: CategoryData;
    education: CategoryData;
    medical: CategoryData;
    convenience: CategoryData;
    living: CategoryData;
  };
  facilities: Record<string, FacilityGroup>;
  totalScore: number;
  totalGrade: string;
  aiComment: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useNeighborhoodData() {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kakaoMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);

  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [visibleFacilities, setVisibleFacilities] = useState<Set<string>>(new Set());

  // Restore last address from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vestra_last_address");
      if (saved) setAddress(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCat = (key: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAnalyze = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      localStorage.setItem("vestra_last_address", address);
      const res = await fetch("/api/neighborhood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "분석에 실패했습니다.");
        return;
      }
      setResult(json);
      setExpandedCats(new Set(["transport", "education", "medical", "convenience", "living"]));
      setVisibleFacilities(new Set(Object.keys(json.facilities || {})));
    } catch {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 카카오맵 초기화 (빈 지도)
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maps = (window as any).kakao.maps;
      const center = new maps.LatLng(37.5665, 126.978);
      const map = new maps.Map(mapRef.current, { center, level: 8 });
      kakaoMapRef.current = map;
    };

    const tryInit = () => {
      if (!mapRef.current) return false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (!w.kakao?.maps?.LatLng) {
        if (w.kakao?.maps?.load) {
          w.kakao.maps.load(() => initMap());
          return true;
        }
        return false;
      }
      initMap();
      return true;
    };

    let rendered = false;
    const pollId = setInterval(() => {
      if (rendered) return;
      if (tryInit()) {
        rendered = true;
        clearInterval(pollId);
      }
    }, 300);
    if (tryInit()) {
      rendered = true;
      clearInterval(pollId);
    }
    const tid = setTimeout(() => clearInterval(pollId), 15000);
    return () => {
      clearInterval(pollId);
      clearTimeout(tid);
    };
  }, []);

  // 분석 결과 → 지도에 마커 표시
  const renderMarkers = useCallback(() => {
    if (!result || !kakaoMapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maps = (window as any).kakao.maps;
    const map = kakaoMapRef.current;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    const center = new maps.LatLng(result.lat, result.lng);
    map.setCenter(center);
    map.setLevel(5);

    const circle = new maps.Circle({
      map,
      center,
      radius: 1000,
      strokeWeight: 2,
      strokeColor: "#6366f1",
      strokeOpacity: 0.4,
      fillColor: "#6366f1",
      fillOpacity: 0.06,
    });
    circleRef.current = circle;

    const centerMarker = new maps.Marker({ map, position: center, zIndex: 10 });
    overlaysRef.current.push(centerMarker);

    if (result.facilities) {
      for (const [key, fac] of Object.entries(result.facilities)) {
        if (!visibleFacilities.has(key)) continue;
        const color = (fac as FacilityGroup).color;
        for (const item of (fac as FacilityGroup).items.slice(0, 8)) {
          const pos = new maps.LatLng(item.lat, item.lng);
          const content = document.createElement("div");
          content.innerHTML = `<div style="background:${color};color:#fff;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);border:2px solid #fff;cursor:pointer">${item.name.length > 8 ? item.name.slice(0, 8) + "…" : item.name}</div>`;
          const overlay = new maps.CustomOverlay({
            map,
            position: pos,
            content,
            yAnchor: 1.3,
          });
          overlaysRef.current.push(overlay);
        }
      }
    }
  }, [result, visibleFacilities]);

  useEffect(() => {
    if (result) renderMarkers();
  }, [result, renderMarkers]);

  const toggleFacility = (key: string) => {
    setVisibleFacilities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllFacilities = (show: boolean) => {
    if (result?.facilities) {
      setVisibleFacilities(show ? new Set(Object.keys(result.facilities)) : new Set());
    }
  };

  const navigateTo = (lat: number, lng: number) => {
    if (kakaoMapRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maps = (window as any).kakao.maps;
      kakaoMapRef.current.setCenter(new maps.LatLng(lat, lng));
      kakaoMapRef.current.setLevel(3);
    }
  };

  return {
    mapRef,
    address,
    setAddress,
    loading,
    result,
    error,
    expandedCats,
    visibleFacilities,
    toggleCat,
    handleAnalyze,
    toggleFacility,
    toggleAllFacilities,
    navigateTo,
  };
}
