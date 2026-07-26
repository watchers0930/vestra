"use client";

import { useState, useEffect, useRef } from "react";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

interface KakaoMarkersMapProps {
  markers: MapMarker[];
  activeId: string | null;
  onMarkerClick: (id: string) => void;
  panTo: { lat: number; lng: number } | null;
  onRegionChange?: (dong: string, gu: string, si: string) => void;
}

export function KakaoMarkersMap({ markers, activeId, onMarkerClick, panTo, onRegionChange }: KakaoMarkersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function initMap() {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;
      const map = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(37.5172, 127.0473),
        level: 7,
      });
      mapInstanceRef.current = map;
      if (!cancelled) {
        setMapReady(true);
        if (onRegionChange && window.kakao?.maps?.services?.Geocoder) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const geocoder = new (window.kakao.maps.services as any).Geocoder();
          const center = map.getCenter();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          geocoder.coord2RegionCode(center.getLng(), center.getLat(), (result: any[], status: string) => {
            if (status === window.kakao.maps.services.Status.OK) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const r = result.find((r: any) => r.region_type === "H") || result[0];
              if (r && !cancelled) {
                onRegionChange(
                  r.region_3depth_name || "",
                  r.region_2depth_name || "",
                  r.region_1depth_name || "",
                );
              }
            }
          });
        }
      }
    }

    function tryInit() {
      if (window.kakao?.maps?.Map) {
        initMap();
      } else if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => { if (!cancelled) initMap(); });
      } else {
        const handler = () => { if (!cancelled) tryInit(); };
        window.addEventListener("kakao-maps-ready", handler, { once: true });
        const t0 = Date.now();
        const timer = setInterval(() => {
          if (cancelled) { clearInterval(timer); return; }
          if (window.kakao?.maps?.Map) {
            clearInterval(timer); initMap();
          } else if (Date.now() - t0 > 15000) {
            clearInterval(timer);
          }
        }, 300);
        return () => { window.removeEventListener("kakao-maps-ready", handler); clearInterval(timer); };
      }
    }

    const cleanup = tryInit();
    return () => { cancelled = true; cleanup?.(); };
  }, []);

  // idle 이벤트 — 지도 이동 시 시/구/동 업데이트
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !onRegionChange || !window.kakao?.maps?.services?.Geocoder) return;
    const cb = onRegionChange;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geocoder = new (window.kakao.maps.services as any).Geocoder();
    function fetchRegion() {
      const center = map.getCenter();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      geocoder.coord2RegionCode(center.getLng(), center.getLat(), (result: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = result.find((r: any) => r.region_type === "H") || result[0];
          if (r) cb(r.region_3depth_name || "", r.region_2depth_name || "", r.region_1depth_name || "");
        }
      });
    }
    window.kakao.maps.event.addListener(map, "idle", fetchRegion);
    return () => { window.kakao.maps.event.removeListener(map, "idle", fetchRegion); };
  }, [mapReady, onRegionChange]);

  // 마커 갱신
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao?.maps || !mapReady) return;
    overlaysRef.current.forEach((ov) => ov.setMap(null));
    overlaysRef.current = [];
    markers.forEach((m) => {
      const isActive = m.id === activeId;
      // DOM 엘리먼트로 생성해야 클릭 리스너가 정상 동작 (문자열 content는 getContent()가 string 반환)
      const el = document.createElement("div");
      el.style.cssText = [
        "display:inline-flex",
        "align-items:center",
        `padding:5px 10px`,
        `background:${isActive ? "#0071e3" : "#fff"}`,
        `color:${isActive ? "#fff" : "#1d1d1f"}`,
        `border:2px solid ${isActive ? "#0071e3" : "#d1d1d6"}`,
        "border-radius:20px",
        "font-size:12px",
        "font-weight:700",
        "box-shadow:0 2px 8px rgba(0,0,0,0.15)",
        "cursor:pointer",
        "white-space:nowrap",
        "transform:translateY(-50%)",
        "user-select:none",
      ].join(";");
      el.textContent = m.label;
      el.addEventListener("click", () => onMarkerClick(m.id));
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(m.lat, m.lng),
        content: el,
        yAnchor: 1,
        clickable: true,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });
  }, [markers, activeId, onMarkerClick, mapReady]);

  // panTo
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !panTo || !window.kakao?.maps || !mapReady) return;
    map.panTo(new window.kakao.maps.LatLng(panTo.lat, panTo.lng));
  }, [panTo, mapReady]);

  return <div ref={mapRef} className="h-full w-full" />;
}
