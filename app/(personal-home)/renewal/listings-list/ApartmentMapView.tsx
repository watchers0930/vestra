"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { KakaoMarkersMap, type MapMarker } from "@/app/(app)/listings/components/KakaoMarkersMap";

interface Apt {
  id: string;
  aptName: string;
  dong: string;
  area: number;
  floor: number;
  buildYear: number;
  dealAmount: number;
  dealDate: string;
  lat?: number;
  lng?: number;
}

function formatEok(won: number): string {
  if (!won) return "-";
  if (won >= 100_000_000) {
    const s = (won / 100_000_000).toFixed(1);
    return `${s.endsWith(".0") ? s.slice(0, -2) : s}억`;
  }
  if (won >= 10_000) return `${Math.floor(won / 10_000)}만`;
  return `${won.toLocaleString()}원`;
}

interface Props {
  region: string;
  onClose: () => void;
}

export function ApartmentMapView({ region, onClose }: Props) {
  const [items, setItems] = useState<Apt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [panTo, setPanTo] = useState<{ lat: number; lng: number } | null>(null);

  const loadApts = useCallback(async (regionName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/apartments?region=${encodeURIComponent(regionName)}&limit=60&geocode=1`);
      const data = res.ok ? await res.json() : { items: [] };
      const its: Apt[] = data.items ?? [];
      setItems(its);
      const first = its.find((i) => i.lat != null && i.lng != null);
      if (first) setPanTo({ lat: first.lat!, lng: first.lng! });
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApts(region); }, [region, loadApts]);

  const markers = useMemo<MapMarker[]>(
    () =>
      items
        .filter((i) => i.lat != null && i.lng != null)
        .map((i) => ({ id: i.id, lat: i.lat!, lng: i.lng!, label: formatEok(i.dealAmount) })),
    [items],
  );

  const handleSelect = useCallback((apt: Apt) => {
    setActiveId(apt.id);
    if (apt.lat != null && apt.lng != null) setPanTo({ lat: apt.lat, lng: apt.lng });
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white overflow-hidden">
      {/* 헤더 */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #E8EDF5", background: "#fff", padding: "0 16px", height: 52, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onClose} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 0", fontSize: 13, fontWeight: 500, color: "#6e6e73", background: "none", border: "none", cursor: "pointer" }}>✕ 닫기</button>
          <div style={{ width: 1, height: 18, background: "#E8EDF5" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1d2e" }}>{region} 전체 매물</span>
          <span style={{ fontSize: 13, color: "#8e8e93" }}>{loading ? "불러오는 중…" : `${markers.length}건`}</span>
        </div>
        <button onClick={onClose} style={{ padding: "7px 13px", borderRadius: 8, background: "#f5f5f7", color: "#3d3d3f", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>목록</button>
      </header>

      {/* 바디: 사이드바 + 지도 */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside style={{ width: 340, flexShrink: 0, borderRight: "1px solid #E8EDF5", overflowY: "auto", background: "#fff" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#aeaeb2", fontSize: 13 }}>불러오는 중…</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#aeaeb2", fontSize: 13 }}>{region} 매물이 없습니다</div>
          ) : (
            items.map((a) => (
              <button
                key={a.id}
                onClick={() => handleSelect(a)}
                style={{
                  width: "100%", textAlign: "left", padding: "12px 16px",
                  borderBottom: "1px solid #f0f2f6", cursor: "pointer",
                  background: a.id === activeId ? "#EFF5FF" : "#fff", border: "none",
                  borderLeft: a.id === activeId ? "3px solid #2e4bd8" : "3px solid transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", background: "#e04444", padding: "1px 6px", borderRadius: 4 }}>매매</span>
                  <span style={{ fontSize: 10, fontWeight: 500, color: "#16a34a" }}>안심인증</span>
                  {a.lat == null && <span style={{ fontSize: 10, color: "#c8cad4" }}>(위치정보 없음)</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1d2e" }}>{formatEok(a.dealAmount)}</div>
                <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>{region} {a.dong} {a.aptName}</div>
                <div style={{ fontSize: 11, color: "#b0b4c0", marginTop: 3 }}>아파트 · {a.area}㎡ · {a.floor}층 · {a.dealDate}</div>
              </button>
            ))
          )}
        </aside>

        <div style={{ position: "relative", flex: 1 }}>
          <KakaoMarkersMap markers={markers} activeId={activeId} onMarkerClick={setActiveId} panTo={panTo} />
        </div>
      </div>
    </div>
  );
}
