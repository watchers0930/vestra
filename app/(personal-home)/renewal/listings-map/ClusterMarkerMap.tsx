"use client";

import { useEffect, useRef, useState } from "react";

export interface ClusterItem {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

interface Props {
  items: ClusterItem[];
  selectedId: string | null;
  onMarkerClick: (id: string) => void;
  panTo: { lat: number; lng: number } | null;
}

// 물방울(teardrop) 마커 DOM
function teardropEl(label: string): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;transform:translateY(-100%);user-select:none;";
  const price = document.createElement("div");
  price.textContent = label;
  price.style.cssText = "margin-bottom:3px;padding:3px 9px;background:#2e4bd8;color:#fff;border-radius:14px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(46,75,216,.4);font-family:Paperlogy,Apple SD Gothic Neo,sans-serif;";
  const pin = document.createElement("div");
  pin.style.cssText = "width:22px;height:22px;border-radius:50% 50% 50% 0;background:#2e4bd8;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 3px 10px rgba(46,75,216,.5);position:relative;";
  const dot = document.createElement("div");
  dot.style.cssText = "width:7px;height:7px;border-radius:50%;background:#fff;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);";
  pin.appendChild(dot);
  wrap.appendChild(price);
  wrap.appendChild(pin);
  return wrap;
}

export function ClusterMarkerMap({ items, selectedId, onMarkerClick, panTo }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInst = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clustererRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selOverlayRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // 지도 초기화
  useEffect(() => {
    let cancelled = false;
    function init() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao;
      if (cancelled || !mapRef.current || mapInst.current || !kakao?.maps?.Map) return;
      mapInst.current = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(37.5172, 127.0473),
        level: 7,
      });
      if (!cancelled) setReady(true);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).kakao;
    if (kakao?.maps?.Map) init();
    else if (kakao?.maps?.load) kakao.maps.load(() => { if (!cancelled) init(); });
    else {
      const t0 = Date.now();
      const timer = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const k = (window as any).kakao;
        if (cancelled) { clearInterval(timer); return; }
        if (k?.maps?.Map) { clearInterval(timer); init(); }
        else if (k?.maps?.load) { clearInterval(timer); k.maps.load(() => { if (!cancelled) init(); }); }
        else if (Date.now() - t0 > 15000) clearInterval(timer);
      }, 300);
      return () => { cancelled = true; clearInterval(timer); };
    }
    return () => { cancelled = true; };
  }, []);

  // 마커/클러스터 렌더 (선택 여부에 따라 분기)
  useEffect(() => {
    const map = mapInst.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).kakao;
    if (!map || !ready || !kakao?.maps) return;

    // 초기화
    if (clustererRef.current) clustererRef.current.clear();
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (selOverlayRef.current) { selOverlayRef.current.setMap(null); selOverlayRef.current = null; }

    if (selectedId != null) {
      // 선택 → 선택된 곳만 물방울 마커
      const it = items.find((i) => i.id === selectedId);
      if (it) {
        selOverlayRef.current = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(it.lat, it.lng),
          content: teardropEl(it.label),
          yAnchor: 1,
          zIndex: 10,
        });
        selOverlayRef.current.setMap(map);
      }
      return;
    }

    // 미선택 → 클러스터(확대 시 개별 마커로 풀림)
    if (!clustererRef.current) {
      clustererRef.current = new kakao.maps.MarkerClusterer({
        map,
        averageCenter: true,
        minLevel: 4,
        gridSize: 70,
        disableClickZoom: true,
      });
      kakao.maps.event.addListener(clustererRef.current, "clusterclick", (cluster: { getCenter: () => unknown }) => {
        map.setLevel(map.getLevel() - 2, { anchor: cluster.getCenter() });
      });
    }
    const markers = items.map((it) => {
      const m = new kakao.maps.Marker({ position: new kakao.maps.LatLng(it.lat, it.lng), title: it.label });
      kakao.maps.event.addListener(m, "click", () => onMarkerClick(it.id));
      return m;
    });
    markersRef.current = markers;
    clustererRef.current.addMarkers(markers);
  }, [items, selectedId, ready, onMarkerClick]);

  // panTo
  useEffect(() => {
    const map = mapInst.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).kakao;
    if (!map || !panTo || !ready || !kakao?.maps) return;
    map.panTo(new kakao.maps.LatLng(panTo.lat, panTo.lng));
  }, [panTo, ready]);

  return <div ref={mapRef} className="h-full w-full" />;
}
