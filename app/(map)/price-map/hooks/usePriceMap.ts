"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatPrice, formatKRW, escapeHtml } from "@/lib/format";
import { analyzeRisk, getAreaColor } from "../lib/analyzeRisk";
import type { AptData, MapResponse } from "../types";
import type { OfficialPriceResult } from "@/lib/official-price-api";

const LOCAL_TTL = 30 * 60 * 1000; // 30분 fresh cache
const LOCAL_MAX_AGE = 24 * 60 * 60 * 1000; // 24시간 stale cache fallback
const PREF_GU_KEY = "pm:selected-gu";
const PREF_TRADE_TYPE_KEY = "pm:trade-type";
const INITIAL_GU = "강남구";
const INITIAL_TRADE_TYPE: "매매" | "전세" = "매매";
const MARKER_CHUNK_SIZE = 12;
const MARKER_BATCH_DELAY = 40;

function localKey(gu: string, tradeType: "매매" | "전세") {
  return `pm:v2:${gu}:${tradeType}`;
}

function readInitialGu() {
  if (typeof window === "undefined") return INITIAL_GU;
  try {
    return localStorage.getItem(PREF_GU_KEY) || INITIAL_GU;
  } catch {
    return INITIAL_GU;
  }
}

function readInitialTradeType(): "매매" | "전세" {
  if (typeof window === "undefined") return INITIAL_TRADE_TYPE;
  try {
    const value = localStorage.getItem(PREF_TRADE_TYPE_KEY);
    return value === "전세" ? "전세" : INITIAL_TRADE_TYPE;
  } catch {
    return INITIAL_TRADE_TYPE;
  }
}

export function usePriceMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const hasKakaoKey = Boolean(process.env.NEXT_PUBLIC_KAKAO_MAP_KEY);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kakaoMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clustererRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circlesRef = useRef<any[]>([]);

  const [data, setData] = useState<MapResponse | null>(null);
  const [selectedGu, setSelectedGu] = useState(readInitialGu);
  const [selectedApt, setSelectedApt] = useState<AptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">(hasKakaoKey ? "loading" : "error");
  const [showGuDropdown, setShowGuDropdown] = useState(false);
  const [selectedSido, setSelectedSido] = useState("서울");
  const [tradeType, setTradeType] = useState<"매매" | "전세">(readInitialTradeType);
  const [riskPopup, setRiskPopup] = useState<{ apt: AptData; risk: ReturnType<typeof analyzeRisk> } | null>(null);
  const [officialPriceLabel, setOfficialPriceLabel] = useState<string>("");

  // 선택된 아파트 변경 시 공시지가 조회
  useEffect(() => {
    if (!selectedApt) { setOfficialPriceLabel(""); return; }
    let cancelled = false;
    setOfficialPriceLabel("조회중...");
    const addr = `${selectedGu} ${selectedApt.dong} ${selectedApt.name}`;
    fetch(`/api/official-price?address=${encodeURIComponent(addr)}`)
      .then((r) => r.ok ? r.json() as Promise<OfficialPriceResult> : null)
      .then((data) => {
        if (cancelled) return;
        if (!data) { setOfficialPriceLabel("데이터 없음"); return; }
        const price = data.aptPrice?.price ?? data.housePrice?.price ?? data.landPrice?.totalPrice;
        setOfficialPriceLabel(price ? formatKRW(price) : "데이터 없음");
      })
      .catch(() => { if (!cancelled) setOfficialPriceLabel("데이터 없음"); });
    return () => { cancelled = true; };
  }, [selectedApt, selectedGu]);

  const selectAndMoveToApt = useCallback((apt: AptData) => {
    setSelectedApt(apt);
    const map = kakaoMapRef.current;
    if (!map || !window.kakao?.maps?.LatLng) return;

    const maps = window.kakao.maps;
    const pos = new maps.LatLng(apt.lat, apt.lng);
    const isMobile = window.innerWidth < 1024;

    map.setCenter(pos);
    map.setLevel(isMobile ? 3 : 2);

    // 모바일: 마커를 화면 상단 1/3 중앙에 배치 (하단 바텀시트 고려)
    if (isMobile) {
      map.panBy(0, Math.round(window.innerHeight / 3));
    }

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

  useEffect(() => {
    try {
      localStorage.setItem(PREF_GU_KEY, selectedGu);
      localStorage.setItem(PREF_TRADE_TYPE_KEY, tradeType);
    } catch {
      // Ignore localStorage access failures.
    }
  }, [selectedGu, tradeType]);

  const fetchData = useCallback(async (gu: string) => {
    let hasUsableCache = false;

    // localStorage 캐시 확인 → 있으면 즉시 표시 후 fresh 여부에 따라 네트워크 생략
    try {
      const raw = localStorage.getItem(localKey(gu, tradeType));
      if (raw) {
        const { ts, payload } = JSON.parse(raw) as { ts: number; payload: MapResponse };
        const age = Date.now() - ts;
        if (age < LOCAL_MAX_AGE) {
          setData(payload);
          setSelectedApt(null);
          setLoading(false);
          hasUsableCache = true;

          if (age < LOCAL_TTL) {
            return; // fresh cache → API 호출 생략
          }
        }
      }
    } catch { /* localStorage 접근 실패 시 무시 */ }

    if (!hasUsableCache) setLoading(true);
    try {
      const res = await fetch(`/api/price-map?gu=${encodeURIComponent(gu)}&type=${tradeType}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json: MapResponse = await res.json();
      setData(json);
      setSelectedApt(null);
      try {
        localStorage.setItem(localKey(gu, tradeType), JSON.stringify({ ts: Date.now(), payload: json }));
      } catch { /* QuotaExceededError 무시 */ }
    } catch (err) {
      console.error("시세 데이터 로드 실패:", err);
      if (!hasUsableCache) setData(null);
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
    if (!hasKakaoKey) {
      setMapStatus("error");
      return;
    }
    if (!mapRef.current) return;
    let cancelled = false;
    let initialized = false;
    let resizeObserver: ResizeObserver | null = null;

    const initMap = () => {
      if (cancelled || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const maps = window.kakao.maps;
      // 데이터가 없으면 강남구 중심으로 빈 지도 표시
      const defaultCenter = new maps.LatLng(37.4979, 127.0276);
      const map = new maps.Map(mapRef.current!, { center: defaultCenter, level: 7 });
      map.setMinLevel(1);
      map.setMaxLevel(10);
      kakaoMapRef.current = map;
      resizeObserver = new ResizeObserver(() => {
        const currentMap = kakaoMapRef.current;
        const container = mapRef.current;
        if (!currentMap || !container) return;
        const nextRect = container.getBoundingClientRect();
        if (nextRect.width <= 0 || nextRect.height <= 0) return;
        const center = currentMap.getCenter();
        currentMap.relayout();
        if (center) currentMap.setCenter(center);
      });
      resizeObserver.observe(mapRef.current);
      requestAnimationFrame(() => {
        if (!kakaoMapRef.current) return;
        const center = kakaoMapRef.current.getCenter();
        kakaoMapRef.current.relayout();
        if (center) kakaoMapRef.current.setCenter(center);
      });
      initialized = true;
      setMapStatus("ready");
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

    const handleSdkReady = () => {
      if (!initialized) tryInit();
    };

    window.addEventListener("kakao-maps-ready", handleSdkReady);
    const pollId = setInterval(() => { if (initialized) return; if (tryInit()) { initialized = true; clearInterval(pollId); } }, 300);
    if (tryInit()) { initialized = true; clearInterval(pollId); }
    const timeoutId = setTimeout(() => {
      clearInterval(pollId);
      if (!initialized && !cancelled) {
        setMapStatus("error");
      }
    }, 8000);

    return () => {
      cancelled = true;
      window.removeEventListener("kakao-maps-ready", handleSdkReady);
      clearInterval(pollId);
      clearTimeout(timeoutId);
      resizeObserver?.disconnect();
      if (clustererRef.current) { clustererRef.current.clear(); clustererRef.current = null; }
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
      kakaoMapRef.current = null;
    };
  }, [hasKakaoKey]);

  // ── useEffect #2: data 변경 시 마커/클러스터만 업데이트 ──
  // 지도 인스턴스(kakaoMapRef)는 이미 초기화된 상태로 공유
  useEffect(() => {
    if (!data || !kakaoMapRef.current || mapStatus !== "ready") return;
    let cancelled = false;
    let chunkTimer: ReturnType<typeof setTimeout> | null = null;

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

      const markerSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="6" fill="#4f46e5" fill-opacity="0.92" />
          <circle cx="10" cy="10" r="2.5" fill="white" />
        </svg>
      `.trim();
      const markerImage = new maps.MarkerImage(
        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`,
        new maps.Size(20, 20),
        { offset: new maps.Point(10, 10) }
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allOverlayEntries: { overlay: any | null; apt: AptData; position: any; content: HTMLDivElement | null }[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allMarkers: any[] = [];

      function createOverlayContent(apt: AptData) {
        const priceText = formatPrice(apt.price);
        const bgColor = getAreaColor(apt.area);
        const changeHtml = apt.change !== null
          ? `<div style="font-size:10px;color:#fff;background:rgba(255,255,255,.2);border-radius:4px;padding:1px 4px;margin-top:2px">${apt.change >= 0 ? "+" : ""}${escapeHtml(apt.change)}%</div>`
          : "";
        const content = document.createElement("div");
        content.innerHTML = `<div style="cursor:pointer;padding:4px 10px;border-radius:8px;font-size:13px;font-weight:700;color:#fff;background:${bgColor};box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap;line-height:1.3;text-align:center;min-width:50px"><div style="font-size:11px;opacity:.85">${escapeHtml(apt.area)}평</div><div>${escapeHtml(priceText)}</div>${changeHtml}</div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid ${bgColor};margin:0 auto"></div>`;
        content.style.cssText = "display:flex;flex-direction:column;align-items:center";
        content.addEventListener("click", () => selectAndMoveToApt(apt));
        return content;
      }

      function ensureOverlay(entry: typeof allOverlayEntries[number]) {
        if (!entry.overlay) {
          if (!entry.content) {
            entry.content = createOverlayContent(entry.apt);
          }
          entry.overlay = new maps.CustomOverlay({
            position: entry.position,
            content: entry.content,
            yAnchor: 1.1,
            map: null,
          });
        }
        return entry.overlay;
      }

      function createMarker(apt: AptData) {
        const position = new maps.LatLng(apt.lat, apt.lng);
        const marker = new maps.Marker({ position, image: markerImage });
        allOverlayEntries.push({ overlay: null, apt, position, content: null });
        allMarkers.push(marker);
        return marker;
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
          updateOverlays();
          return;
        }
        const end = Math.min(chunkIdx + MARKER_CHUNK_SIZE, apartments.length);
        const chunkMarkers = [];
        for (let i = chunkIdx; i < end; i++) {
          chunkMarkers.push(createMarker(apartments[i]));
        }
        clusterer.addMarkers(chunkMarkers);
        chunkIdx = end;
        if (chunkIdx <= MARKER_CHUNK_SIZE) {
          updateOverlays();
        }
        chunkTimer = setTimeout(loadNextChunk, MARKER_BATCH_DELAY);
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
          allOverlayEntries.forEach((entry, idx) => {
            const { position } = entry;
            if (bounds.contain(position)) {
              if (!visibleOverlays.has(idx)) ensureOverlay(entry).setMap(map);
              newVisible.add(idx);
            } else {
              if (visibleOverlays.has(idx) && entry.overlay) entry.overlay.setMap(null);
            }
          });
          visibleOverlays.forEach((idx) => {
            if (!newVisible.has(idx) && allOverlayEntries[idx].overlay) {
              allOverlayEntries[idx].overlay.setMap(null);
            }
          });
          visibleOverlays = newVisible;
        } else {
          visibleOverlays.forEach((idx) => {
            if (allOverlayEntries[idx].overlay) allOverlayEntries[idx].overlay.setMap(null);
          });
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
      if (chunkTimer) clearTimeout(chunkTimer);
    };
  }, [data, mapStatus, selectAndMoveToApt]);

  const topChanges = data?.apartments
    ? [...data.apartments].filter((a) => a.change !== null).sort((a, b) => (b.change as number) - (a.change as number)).slice(0, 5)
    : [];

  return {
    mapRef, data, selectedGu, setSelectedGu,
    selectedApt, loading, showGuDropdown, setShowGuDropdown,
    selectedSido, setSelectedSido, tradeType, setTradeType,
    riskPopup, setRiskPopup,
    selectAndMoveToApt, topChanges, analyzeRisk, mapStatus,
    officialPriceLabel,
  };
}
