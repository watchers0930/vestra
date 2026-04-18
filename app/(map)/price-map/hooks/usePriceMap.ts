"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatPrice, escapeHtml } from "@/lib/format";
import { analyzeRisk, getAreaColor } from "../lib/analyzeRisk";
import type { AptData, MapResponse } from "../types";

export function usePriceMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kakaoMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clustererRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circlesRef = useRef<any[]>([]);

  const [data, setData] = useState<MapResponse | null>(null);
  const [selectedGu, setSelectedGu] = useState("강남구");
  const [selectedApt, setSelectedApt] = useState<AptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuDropdown, setShowGuDropdown] = useState(false);
  const [selectedSido, setSelectedSido] = useState("서울");
  const [tradeType, setTradeType] = useState<"매매" | "전세">("매매");
  const [riskPopup, setRiskPopup] = useState<{ apt: AptData; risk: ReturnType<typeof analyzeRisk> } | null>(null);

  const selectAndMoveToApt = useCallback((apt: AptData) => {
    setSelectedApt(apt);
    const map = kakaoMapRef.current;
    if (!map || !window.kakao?.maps?.LatLng) return;

    const maps = window.kakao.maps;
    const pos = new maps.LatLng(apt.lat, apt.lng);
    map.setCenter(pos);
    map.setLevel(2);

    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    const radii = [
      { radius: 100, color: "#6366f1", opacity: 0.15, strokeWeight: 2 },
      { radius: 200, color: "#818cf8", opacity: 0.10, strokeWeight: 1.5 },
      { radius: 500, color: "#a5b4fc", opacity: 0.06, strokeWeight: 1 },
    ];

    radii.forEach(({ radius, color, opacity, strokeWeight }) => {
      const circle = new maps.Circle({
        center: pos, radius, strokeWeight, strokeColor: color,
        strokeOpacity: 0.8, strokeStyle: "solid", fillColor: color, fillOpacity: opacity,
      });
      circle.setMap(map);
      circlesRef.current.push(circle);

      const labelEl = document.createElement("div");
      labelEl.style.cssText = "font-size:10px;color:#6366f1;font-weight:600;background:white;padding:1px 4px;border-radius:4px;border:1px solid #c7d2fe;opacity:0.9;";
      labelEl.textContent = `${radius}m`;
      const labelPos = new maps.LatLng(apt.lat + radius / 111320, apt.lng);
      const label = new maps.CustomOverlay({ position: labelPos, content: labelEl, yAnchor: 0.5 });
      label.setMap(map);
      circlesRef.current.push(label);
    });
  }, []);

  const LOCAL_TTL = 5 * 60 * 1000; // 5분
  const localKey = (gu: string) => `pm:${gu}:${tradeType}`;

  const fetchData = useCallback(async (gu: string) => {
    // localStorage 캐시 확인 → 있으면 즉시 표시 후 백그라운드 갱신
    try {
      const raw = localStorage.getItem(localKey(gu));
      if (raw) {
        const { ts, payload } = JSON.parse(raw) as { ts: number; payload: MapResponse };
        if (Date.now() - ts < LOCAL_TTL) {
          setData(payload);
          setSelectedApt(null);
          setLoading(false);
          return; // 캐시 유효 → API 호출 생략
        }
      }
    } catch { /* localStorage 접근 실패 시 무시 */ }

    setLoading(true);
    try {
      const res = await fetch(`/api/price-map?gu=${encodeURIComponent(gu)}&type=${tradeType}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json: MapResponse = await res.json();
      setData(json);
      setSelectedApt(null);
      try {
        localStorage.setItem(localKey(gu), JSON.stringify({ ts: Date.now(), payload: json }));
      } catch { /* QuotaExceededError 무시 */ }
    } catch (err) {
      console.error("시세 데이터 로드 실패:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tradeType]);

  useEffect(() => {
    fetchData(selectedGu);
  }, [selectedGu, fetchData]);

  // ── useEffect #1: 마운트 시 카카오 SDK 로드 + 빈 지도 초기화 ──
  // 데이터와 무관하게 컴포넌트 마운트 즉시 실행 → 지도가 먼저 보임
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    const initMap = () => {
      if (cancelled || !mapRef.current) return;
      const maps = window.kakao.maps;
      // 데이터가 없으면 강남구 중심으로 빈 지도 표시
      const defaultCenter = new maps.LatLng(37.4979, 127.0276);
      const map = new maps.Map(mapRef.current!, { center: defaultCenter, level: 7 });
      map.setMinLevel(1);
      map.setMaxLevel(10);
      kakaoMapRef.current = map;
    };

    const tryInit = () => {
      if (cancelled || !mapRef.current) return false;
      if (typeof window.kakao?.maps?.LatLng === "function" && typeof window.kakao?.maps?.MarkerClusterer === "function") {
        initMap(); return true;
      }
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => {
          if (!cancelled && mapRef.current && typeof window.kakao.maps.LatLng === "function") initMap();
        });
        return true;
      }
      return false;
    };

    let initialized = false;
    const pollId = setInterval(() => { if (initialized) return; if (tryInit()) { initialized = true; clearInterval(pollId); } }, 300);
    if (tryInit()) { initialized = true; clearInterval(pollId); }
    const timeoutId = setTimeout(() => clearInterval(pollId), 15000);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearTimeout(timeoutId);
      if (clustererRef.current) { clustererRef.current.clear(); clustererRef.current = null; }
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
      kakaoMapRef.current = null;
    };
  }, [mapRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── useEffect #2: data 변경 시 마커/클러스터만 업데이트 ──
  // 지도 인스턴스(kakaoMapRef)는 이미 초기화된 상태로 공유
  useEffect(() => {
    if (!data || !kakaoMapRef.current) return;
    let cancelled = false;

    const renderMarkers = () => {
      if (cancelled || !kakaoMapRef.current) return;
      const maps = window.kakao.maps;
      const map = kakaoMapRef.current;

      // 지도 중심/범위 업데이트
      const center = new maps.LatLng(data.center.lat, data.center.lng);
      map.setCenter(center);
      if (data.apartments.length > 0) {
        const bounds = new maps.LatLngBounds();
        data.apartments.forEach((apt) => bounds.extend(new maps.LatLng(apt.lat, apt.lng)));
        map.setBounds(bounds, 50);
      }

      // 기존 클러스터/원 초기화
      if (clustererRef.current) { clustererRef.current.clear(); clustererRef.current = null; }
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];

      const invisibleImage = new maps.MarkerImage(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        new maps.Size(1, 1),
      );

      const CHUNK_SIZE = 20;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allOverlays: { overlay: any; apt: AptData; position: any }[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allMarkers: any[] = [];

      function createMarkerAndOverlay(apt: AptData) {
        const position = new maps.LatLng(apt.lat, apt.lng);
        const marker = new maps.Marker({ position, image: invisibleImage });
        const priceText = formatPrice(apt.price);
        const bgColor = getAreaColor(apt.area);
        const changeHtml = apt.change !== null
          ? `<div style="font-size:10px;color:#fff;background:rgba(255,255,255,.2);border-radius:4px;padding:1px 4px;margin-top:2px">${apt.change >= 0 ? "+" : ""}${escapeHtml(apt.change)}%</div>`
          : "";
        const content = document.createElement("div");
        content.innerHTML = `<div style="cursor:pointer;padding:4px 10px;border-radius:8px;font-size:13px;font-weight:700;color:#fff;background:${bgColor};box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap;line-height:1.3;text-align:center;min-width:50px"><div style="font-size:11px;opacity:.85">${escapeHtml(apt.area)}평</div><div>${escapeHtml(priceText)}</div>${changeHtml}</div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid ${bgColor};margin:0 auto"></div>`;
        content.style.cssText = "display:flex;flex-direction:column;align-items:center";
        content.addEventListener("click", () => selectAndMoveToApt(apt));
        const overlay = new maps.CustomOverlay({ position, content, yAnchor: 1.1, map: null });
        allOverlays.push({ overlay, apt, position });
        allMarkers.push(marker);
      }

      const clusterer = new maps.MarkerClusterer({
        map, markers: [], gridSize: 70, minLevel: 5,
        disableClickZoom: false, averageCenter: true,
        styles: [
          { width: "44px", height: "44px", background: "rgba(99,102,241,.85)", borderRadius: "50%", color: "#fff", textAlign: "center", fontWeight: "700", fontSize: "14px", lineHeight: "44px" },
          { width: "56px", height: "56px", background: "rgba(79,70,229,.85)", borderRadius: "50%", color: "#fff", textAlign: "center", fontWeight: "700", fontSize: "15px", lineHeight: "56px" },
          { width: "68px", height: "68px", background: "rgba(55,48,163,.85)", borderRadius: "50%", color: "#fff", textAlign: "center", fontWeight: "700", fontSize: "16px", lineHeight: "68px" },
        ],
      });
      clustererRef.current = clusterer;

      let chunkIdx = 0;
      const apartments = data.apartments;
      const loadNextChunk = () => {
        if (cancelled || chunkIdx >= apartments.length) {
          clusterer.addMarkers(allMarkers);
          updateOverlays();
          return;
        }
        const end = Math.min(chunkIdx + CHUNK_SIZE, apartments.length);
        for (let i = chunkIdx; i < end; i++) createMarkerAndOverlay(apartments[i]);
        chunkIdx = end;
        requestAnimationFrame(loadNextChunk);
      };
      requestAnimationFrame(loadNextChunk);

      const DETAIL_LEVEL = 4;
      let visibleOverlays = new Set<number>();

      const updateOverlays = () => {
        const level = map.getLevel();
        if (level <= DETAIL_LEVEL) {
          clusterer.setMap(null);
          const bounds = map.getBounds();
          const newVisible = new Set<number>();
          allOverlays.forEach(({ overlay, position }, idx) => {
            if (bounds.contain(position)) {
              if (!visibleOverlays.has(idx)) overlay.setMap(map);
              newVisible.add(idx);
            } else {
              if (visibleOverlays.has(idx)) overlay.setMap(null);
            }
          });
          visibleOverlays.forEach((idx) => { if (!newVisible.has(idx)) allOverlays[idx].overlay.setMap(null); });
          visibleOverlays = newVisible;
        } else {
          visibleOverlays.forEach((idx) => allOverlays[idx].overlay.setMap(null));
          visibleOverlays = new Set();
          clusterer.setMap(map);
        }
      };

      maps.event.addListener(map, "zoom_changed", updateOverlays);
      maps.event.addListener(map, "dragend", updateOverlays);
    };

    // kakaoMapRef가 이미 초기화되어 있으면 즉시 실행, 아니면 SDK 로드 대기
    if (typeof window.kakao?.maps?.LatLng === "function") {
      renderMarkers();
    } else if (window.kakao?.maps?.load) {
      window.kakao.maps.load(() => {
        if (!cancelled) renderMarkers();
      });
    }

    return () => {
      cancelled = true;
    };
  }, [data, selectAndMoveToApt]);

  const topChanges = data?.apartments
    ? [...data.apartments].filter((a) => a.change !== null).sort((a, b) => (b.change as number) - (a.change as number)).slice(0, 5)
    : [];

  return {
    mapRef, data, selectedGu, setSelectedGu,
    selectedApt, loading, showGuDropdown, setShowGuDropdown,
    selectedSido, setSelectedSido, tradeType, setTradeType,
    riskPopup, setRiskPopup,
    selectAndMoveToApt, topChanges, analyzeRisk,
  };
}
