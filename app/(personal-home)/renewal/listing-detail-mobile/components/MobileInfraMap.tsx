"use client";

/**
 * 모바일 전용 인프라 지도 탭.
 * PC 공용 InfraMap(app/(app)/listings/[id]/components/ListingInfoTabs.tsx)을 복제한 뒤,
 * 좌측 시설 목록 패널의 배경만 모바일 전용 CSS(mobile-infra.module.css)로 분리해
 * 반투명 유리 배경을 적용한다. 공용 컴포넌트/CSS는 건드리지 않는다 (PC 무영향).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, ChevronLeft, List } from "lucide-react";
import { useKakaoMap } from "@/app/(app)/listings/[id]/components/useKakaoMap";
import { panToVisibleCenter } from "./mapPan";
import ms from "./mobile-infra.module.css";

/** 목록 패널 폭(178px)의 절반 — 열려 있을 때 가시영역 중앙 보정값 */
const PANEL_OFFSET = 89;

const INFRA_CATS = [
  { code: "SW8", name: "지하철", color: "#2563EB" },
  { code: "CS2", name: "편의점", color: "#7C3AED" },
  { code: "MT1", name: "마트",   color: "#EA580C" },
  { code: "CE7", name: "카페",   color: "#92400E" },
  { code: "FD6", name: "음식점", color: "#DC2626" },
  { code: "HP8", name: "병원",   color: "#059669" },
] as const;
type InfraCatCode = typeof INFRA_CATS[number]["code"] | "ALL";
interface PlaceItem { name: string; distance: string; catCode: string; lat: number; lng: number; }

export default function MobileInfraMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef         = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dotsByCat      = useRef<Map<string, { ov: any; shape: HTMLDivElement }[]>>(new Map());
  const placesByCat    = useRef<Map<string, PlaceItem[]>>(new Map());
  const selectedShape  = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<InfraCatCode>("ALL");
  const [items, setItems]       = useState<PlaceItem[]>([]);
  const [loaded, setLoaded]     = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [listOpen, setListOpen] = useState(true);

  const clearSelectedShape = useCallback(() => {
    if (selectedShape.current) {
      selectedShape.current.style.background = "#c7c7cc";
      selectedShape.current.style.boxShadow = "0 2px 8px rgba(0,0,0,.2)";
      selectedShape.current = null;
    }
  }, []);

  const applyFilter = useCallback((code: InfraCatCode) => {
    const map = mapRef.current; if (!map) return;
    clearSelectedShape();
    dotsByCat.current.forEach((entries, catCode) => {
      const vis = code === "ALL" || code === catCode;
      entries.forEach(({ ov, shape }) => {
        ov.setMap(vis ? map : null);
        if (vis) { shape.style.background = "#c7c7cc"; shape.style.boxShadow = "0 2px 8px rgba(0,0,0,.2)"; }
      });
    });
  }, [clearSelectedShape]);

  function handleSelect(code: InfraCatCode) {
    setSelected(code); applyFilter(code);
    if (code === "ALL") {
      const all: PlaceItem[] = [];
      INFRA_CATS.forEach((c) => (placesByCat.current.get(c.code) ?? []).forEach((p) => all.push(p)));
      setItems(all);
    } else setItems(placesByCat.current.get(code) ?? []);
  }

  function handleItemClick(item: PlaceItem) {
    panToVisibleCenter(mapRef.current, window.kakao, item.lat, item.lng, listOpen ? PANEL_OFFSET : 0);
    clearSelectedShape();
    const catItems = placesByCat.current.get(item.catCode) ?? [];
    const idx = catItems.findIndex((p) => p.lat === item.lat && p.lng === item.lng);
    if (idx < 0) return;
    const entries = dotsByCat.current.get(item.catCode) ?? [];
    const cat = INFRA_CATS.find((c) => c.code === item.catCode);
    if (entries[idx] && cat) {
      entries[idx].shape.style.background = cat.color;
      entries[idx].shape.style.boxShadow = `0 2px 8px ${cat.color}88`;
      selectedShape.current = entries[idx].shape;
    }
  }

  useKakaoMap(containerRef, (kakao, el) => {
      const dots = dotsByCat.current; const places = placesByCat.current;
      const pos = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(el, { center: pos, level: 4 });
      mapRef.current = map;
      // 건물 핀
      const buildPin = document.createElement("div");
      const bShape = document.createElement("div");
      Object.assign(bShape.style, { width: "22px", height: "22px", borderRadius: "50% 50% 50% 0", background: "#0F2547", transform: "rotate(-45deg)", boxShadow: "0 3px 10px rgba(15,37,71,.55)", border: "2.5px solid #fff", position: "relative" });
      const bDot = document.createElement("div");
      Object.assign(bDot.style, { width: "7px", height: "7px", borderRadius: "50%", background: "#fff", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
      bShape.appendChild(bDot); buildPin.appendChild(bShape);
      new kakao.maps.CustomOverlay({ map, position: pos, content: buildPin, yAnchor: 1.15, zIndex: 20 });
      const ps = new kakao.maps.services.Places();
      let done = 0;
      INFRA_CATS.forEach((cat) => {
        dots.set(cat.code, []); places.set(cat.code, []);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ps.categorySearch(cat.code, (data: any[], status: any) => {
          done++;
          if (status === kakao.maps.services.Status.OK) {
            data.slice(0, 5).forEach((p) => {
              const pPos = new kakao.maps.LatLng(p.y, p.x);
              const markerEl = document.createElement("div");
              Object.assign(markerEl.style, { display: "flex", flexDirection: "column", alignItems: "center", cursor: "default" });
              const mShape = document.createElement("div");
              Object.assign(mShape.style, { width: "18px", height: "18px", borderRadius: "50% 50% 50% 0", background: "#c7c7cc", transform: "rotate(-45deg)", boxShadow: "0 2px 8px rgba(0,0,0,.2)", border: "2px solid #fff", position: "relative" });
              const mDot = document.createElement("div");
              Object.assign(mDot.style, { width: "5px", height: "5px", borderRadius: "50%", background: "#fff", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
              mShape.appendChild(mDot); markerEl.appendChild(mShape);
              const ov = new kakao.maps.CustomOverlay({ map, position: pPos, content: markerEl, yAnchor: 1.15, zIndex: 5 });
              dots.get(cat.code)!.push({ ov, shape: mShape });
              const d = parseInt(p.distance);
              places.get(cat.code)!.push({ name: p.place_name, distance: d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`, catCode: cat.code, lat: parseFloat(p.y), lng: parseFloat(p.x) });
            });
          }
          if (done === INFRA_CATS.length) { setLoaded(INFRA_CATS.length); setIsLoading(false); }
        }, { location: pos, radius: cat.code === "SW8" ? 1500 : 500, sort: kakao.maps.services.SortBy.DISTANCE });
      });
      return {
        map,
        cleanup: () => {
          dots.forEach((entries) => entries.forEach(({ ov }) => ov.setMap(null)));
          dots.clear(); places.clear(); mapRef.current = null;
        },
      };
  }, [lat, lng]);

  useEffect(() => {
    if (loaded < INFRA_CATS.length) return;
    const all: PlaceItem[] = [];
    INFRA_CATS.forEach((c) => (placesByCat.current.get(c.code) ?? []).forEach((p) => all.push(p)));
    setItems(all);
  }, [loaded]);

  const cat = INFRA_CATS.find((c) => c.code === selected);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 10, scrollbarWidth: "none" as const }}>
        {([{ code: "ALL" as InfraCatCode, name: "전체", color: "#0F2547" }, ...INFRA_CATS]).map((c) => (
          <button key={c.code} onClick={() => handleSelect(c.code as InfraCatCode)}
            style={{ flexShrink: 0, borderRadius: 100, border: "1px solid", padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s",
              background: selected === c.code ? c.color : "#fff", borderColor: selected === c.code ? c.color : "#dde3ef", color: selected === c.code ? "#fff" : "#6e6e73",
            }}>{c.name}
          </button>
        ))}
      </div>
      {/* 지도 전체 폭 + 좌측 슬라이드 반투명 목록 오버레이 */}
      <div className={ms.mapArea}>
        <div className={ms.mapFull}>
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {/* 좌측에서 슬라이드되어 나오는 반투명 목록 */}
        <div className={`${ms.slidePanel} ${listOpen ? "" : ms.closed}`}>
          <div className={ms.slideHeader}>
            <p className={ms.slideTitle}>{selected === "ALL" ? "전체 시설" : `${cat?.name ?? ""} (${items.length})`}</p>
            <button className={ms.slideToggle} onClick={() => setListOpen(false)} aria-label="목록 접기">
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
          </div>
          <div className={ms.slideBody}>
            {items.length === 0
              ? <div className={ms.emptyMsg}>
                  <p style={{ fontSize: 12, color: "#6b7280" }}>{isLoading ? "로딩 중..." : "주변에 없습니다"}</p>
                </div>
              : items.map((item, i) => {
                const ic = INFRA_CATS.find((c) => c.code === item.catCode);
                return (
                  <div key={i} className={ms.listItem} onClick={() => handleItemClick(item)}>
                    <MapPin size={10} strokeWidth={2} style={{ color: ic?.color, flexShrink: 0, marginTop: 2 }} />
                    <div style={{ minWidth: 0 }}>
                      <p className={ms.listName}>{item.name}</p>
                      <p className={ms.listDist}>{item.distance}</p>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* 목록이 접혔을 때 여는 버튼 */}
        {!listOpen && (
          <button className={ms.openBtn} onClick={() => setListOpen(true)}>
            <List size={14} strokeWidth={2} /> 목록
          </button>
        )}
      </div>
    </div>
  );
}
