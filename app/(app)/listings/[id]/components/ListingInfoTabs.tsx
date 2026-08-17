"use client";

import {
  useState, useEffect, useRef,
  useCallback, useMemo, useReducer,
} from "react";
import { MapPin, GraduationCap } from "lucide-react";
import { MarketTab } from "./MarketTab";
import { useKakaoMap } from "./useKakaoMap";

type TabKey = "location" | "infra" | "school" | "market";
const TABS: { key: TabKey; label: string }[] = [
  { key: "location", label: "위치" },
  { key: "infra",    label: "인프라" },
  { key: "school",   label: "학군" },
  { key: "market",   label: "시세" },
];

export interface ListingInfoTabsProps {
  listingId: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}


// ── 위치 지도 ────────────────────────────────────────────────────────────────
export function LocationMap({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useKakaoMap(containerRef, (kakao, el) => {
    const pos = new kakao.maps.LatLng(lat, lng);
    const map = new kakao.maps.Map(el, { center: pos, level: 3 });
    const pin = document.createElement("div");
    const shape = document.createElement("div");
    Object.assign(shape.style, { width: "22px", height: "22px", borderRadius: "50% 50% 50% 0", background: "#0F2547", transform: "rotate(-45deg)", boxShadow: "0 3px 10px rgba(15,37,71,.55)", border: "2.5px solid #fff", position: "relative" });
    const dot = document.createElement("div");
    Object.assign(dot.style, { width: "7px", height: "7px", borderRadius: "50%", background: "#fff", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
    shape.appendChild(dot);
    pin.appendChild(shape);
    new kakao.maps.CustomOverlay({ map, position: pos, content: pin, yAnchor: 1.15, zIndex: 10 });
    return { map };
  }, [lat, lng]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <MapPin size={14} strokeWidth={1.5} color="#0071e3" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>건물 위치</span>
      </div>
      <p style={{ fontSize: 12, color: "#6e6e73", margin: "0 0 10px" }}>{address}</p>
      <div ref={containerRef} style={{ width: "100%", height: 437, borderRadius: 14, border: "1px solid #e8edf5", overflow: "hidden" }} />
    </div>
  );
}

// ── 인프라 지도 ──────────────────────────────────────────────────────────────
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

export function InfraMap({ lat, lng }: { lat: number; lng: number }) {
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
    mapRef.current?.panTo(new window.kakao.maps.LatLng(item.lat, item.lng));
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
      // 건물 핀 (prominent pin)
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
              // 카테고리 색상 핀 마커
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
            style={{ flexShrink: 0, borderRadius: 100, border: "1px solid", padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .15s",
              background: selected === c.code ? c.color : "#fff", borderColor: selected === c.code ? c.color : "#dde3ef", color: selected === c.code ? "#fff" : "#6e6e73",
            }}>{c.name}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, height: 414 }}>
        <div style={{ width: 140, flexShrink: 0, borderRadius: 12, border: "1px solid #e8edf5", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #eef1f8", flexShrink: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>{selected === "ALL" ? "전체 시설" : `${cat?.name ?? ""} (${items.length})`}</p>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {items.length === 0
              ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  <p style={{ fontSize: 11, color: "#aeaeb2" }}>{isLoading ? "로딩 중..." : "주변에 없습니다"}</p>
                </div>
              : items.map((item, i) => {
                const ic = INFRA_CATS.find((c) => c.code === item.catCode);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "8px 12px", borderBottom: "1px solid #f0f3fa", cursor: "pointer" }}
                    onClick={() => handleItemClick(item)}>
                    <MapPin size={10} strokeWidth={2} style={{ color: ic?.color, flexShrink: 0, marginTop: 2 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#1d1d1f", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                      <p style={{ fontSize: 10, color: "#8e8e93", margin: 0, marginTop: 1 }}>{item.distance}</p>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
        <div style={{ flex: 1, borderRadius: 12, border: "1px solid #e8edf5", overflow: "hidden" }}>
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    </div>
  );
}

// ── 학군 지도 ────────────────────────────────────────────────────────────────
const SCHOOL_TYPES = [
  { key: "초등학교", color: "#2563EB" },
  { key: "중학교",   color: "#059669" },
  { key: "고등학교", color: "#DC2626" },
] as const;
type SchoolKey = typeof SCHOOL_TYPES[number]["key"] | "ALL";
interface SchoolItem { name: string; type: typeof SCHOOL_TYPES[number]["key"]; distance: string; lat: number; lng: number; color: string; }
function schType(cat: string): typeof SCHOOL_TYPES[number]["key"] | null {
  if (cat.includes("초등학교")) return "초등학교";
  if (cat.includes("중학교"))   return "중학교";
  if (cat.includes("고등학교")) return "고등학교";
  return null;
}

export function SchoolMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef  = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dotsRef = useRef<Map<string, { ov: any; shape: HTMLDivElement }[]>>(new Map());
  const selectedSchoolShape = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<SchoolKey>("ALL");
  const [{ allItems, loaded }, dispatch] = useReducer(
    (_: { allItems: SchoolItem[]; loaded: boolean }, a: { type: "done"; items: SchoolItem[] }) => ({ allItems: a.items, loaded: true }),
    { allItems: [], loaded: false },
  );
  const listItems = useMemo(() => selected === "ALL" ? allItems : allItems.filter((s) => s.type === selected), [allItems, selected]);

  const clearSelectedSchoolShape = useCallback(() => {
    if (selectedSchoolShape.current) {
      selectedSchoolShape.current.style.background = "#c7c7cc";
      selectedSchoolShape.current.style.boxShadow = "0 2px 8px rgba(0,0,0,.2)";
      selectedSchoolShape.current = null;
    }
  }, []);

  const applyFilter = useCallback((key: SchoolKey) => {
    const map = mapRef.current; if (!map) return;
    clearSelectedSchoolShape();
    dotsRef.current.forEach((entries, type) => {
      const vis = key === "ALL" || key === type;
      entries.forEach(({ ov, shape }) => {
        ov.setMap(vis ? map : null);
        if (vis) { shape.style.background = "#c7c7cc"; shape.style.boxShadow = "0 2px 8px rgba(0,0,0,.2)"; }
      });
    });
  }, [clearSelectedSchoolShape]);

  function handleSchoolItemClick(item: SchoolItem) {
    mapRef.current?.panTo(new window.kakao.maps.LatLng(item.lat, item.lng));
    clearSelectedSchoolShape();
    const entries = dotsRef.current.get(item.type) ?? [];
    const conf = SCHOOL_TYPES.find((t) => t.key === item.type);
    if (entries[0] && conf) {
      entries[0].shape.style.background = conf.color;
      entries[0].shape.style.boxShadow = `0 2px 8px ${conf.color}88`;
      selectedSchoolShape.current = entries[0].shape;
    }
  }

  function handleSelect(key: SchoolKey) { setSelected(key); applyFilter(key); }

  useKakaoMap(containerRef, (kakao, el) => {
      const dots = dotsRef.current;
      const pos = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(el, { center: pos, level: 5 });
      mapRef.current = map;
      // 건물 핀
      const sBuildPin = document.createElement("div");
      const sBShape = document.createElement("div");
      Object.assign(sBShape.style, { width: "22px", height: "22px", borderRadius: "50% 50% 50% 0", background: "#0F2547", transform: "rotate(-45deg)", boxShadow: "0 3px 10px rgba(15,37,71,.55)", border: "2.5px solid #fff", position: "relative" });
      const sBDot = document.createElement("div");
      Object.assign(sBDot.style, { width: "7px", height: "7px", borderRadius: "50%", background: "#fff", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
      sBShape.appendChild(sBDot); sBuildPin.appendChild(sBShape);
      new kakao.maps.CustomOverlay({ map, position: pos, content: sBuildPin, yAnchor: 1.15, zIndex: 20 });
      SCHOOL_TYPES.forEach((t) => dots.set(t.key, []));
      const ps = new kakao.maps.services.Places();
      const found: Record<string, SchoolItem> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ps.categorySearch("SC4", (data: any[], status: any) => {
        if (status === kakao.maps.services.Status.OK) {
          for (const p of data) {
            const type = schType(p.category_name ?? ""); if (!type || found[type]) continue;
            const conf = SCHOOL_TYPES.find((t) => t.key === type)!;
            const dist = parseInt(p.distance, 10);
            const school: SchoolItem = { name: p.place_name, type, color: conf.color, distance: dist <= 800 ? `도보 ${Math.max(1, Math.round(dist / 67))}분` : `버스 ${Math.max(1, Math.round(dist / 250))}분`, lat: parseFloat(p.y), lng: parseFloat(p.x) };
            found[type] = school;
            // 학교 핀 마커
            const sMarker = document.createElement("div");
            Object.assign(sMarker.style, { display: "flex", flexDirection: "column", alignItems: "center", cursor: "default" });
            const sMShape = document.createElement("div");
            Object.assign(sMShape.style, { width: "18px", height: "18px", borderRadius: "50% 50% 50% 0", background: "#c7c7cc", transform: "rotate(-45deg)", boxShadow: "0 2px 8px rgba(0,0,0,.2)", border: "2px solid #fff", position: "relative" });
            const sMDot = document.createElement("div");
            Object.assign(sMDot.style, { width: "5px", height: "5px", borderRadius: "50%", background: "#fff", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
            sMShape.appendChild(sMDot); sMarker.appendChild(sMShape);
            const ov = new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(school.lat, school.lng), content: sMarker, yAnchor: 1.15, zIndex: 5 });
            dots.get(type)!.push({ ov, shape: sMShape });
            if (Object.keys(found).length === 3) break;
          }
        }
        dispatch({ type: "done", items: Object.values(found).sort((a, b) => SCHOOL_TYPES.findIndex((t) => t.key === a.type) - SCHOOL_TYPES.findIndex((t) => t.key === b.type)) });
      }, { location: pos, radius: 3000, size: 15, sort: kakao.maps.services.SortBy.DISTANCE });
      return {
        map,
        cleanup: () => {
          dots.forEach((entries) => entries.forEach(({ ov }) => ov.setMap(null)));
          dots.clear(); mapRef.current = null;
        },
      };
  }, [lat, lng]);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["ALL", ...SCHOOL_TYPES.map((t) => t.key)] as SchoolKey[]).map((key) => {
          const conf = SCHOOL_TYPES.find((t) => t.key === key);
          const active = selected === key;
          return (
            <button key={key} onClick={() => handleSelect(key)}
              style={{ borderRadius: 100, border: "1px solid", padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                background: active ? (conf?.color ?? "#0F2547") : "#fff", borderColor: active ? (conf?.color ?? "#0F2547") : "#dde3ef", color: active ? "#fff" : "#6e6e73",
              }}>{key === "ALL" ? "전체" : key}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, height: 414 }}>
        <div style={{ width: 140, flexShrink: 0, borderRadius: 12, border: "1px solid #e8edf5", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #eef1f8", flexShrink: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>{selected === "ALL" ? "전체 학교" : `${selected} (${listItems.length})`}</p>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {!loaded
              ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><p style={{ fontSize: 11, color: "#aeaeb2" }}>로딩 중...</p></div>
              : listItems.length === 0
              ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: "0 12px" }}><p style={{ fontSize: 11, color: "#aeaeb2", textAlign: "center" }}>반경 3km 내<br/>학교 없음</p></div>
              : listItems.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "8px 12px", borderBottom: "1px solid #f0f3fa", cursor: "pointer" }}
                  onClick={() => handleSchoolItemClick(item)}>
                  <GraduationCap size={10} strokeWidth={2} style={{ color: item.color, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#1d1d1f", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                    <p style={{ fontSize: 10, color: "#8e8e93", margin: 0, marginTop: 1 }}>{item.distance}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
        <div style={{ flex: 1, borderRadius: 12, border: "1px solid #e8edf5", overflow: "hidden" }}>
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <p style={{ fontSize: 11, color: "#aeaeb2", marginTop: 8 }}>학군 정보는 참고용이며, 실제 배정과 다를 수 있습니다.</p>
    </div>
  );
}

// ── 메인 탭 컴포넌트 ─────────────────────────────────────────────────────────
export function ListingInfoTabs({ listingId, address, latitude, longitude }: ListingInfoTabsProps) {
  const [tab, setTab] = useState<TabKey>("location");
  const lat = latitude  ?? 37.5665;
  const lng = longitude ?? 126.978;

  return (
    <div style={{ marginTop: 24 }}>
      {/* 탭 네비게이션 */}
      <div style={{ display: "flex", borderBottom: "1.5px solid #e5e5ea", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, paddingBottom: 12, fontSize: 14, fontWeight: tab === t.key ? 600 : 400, color: tab === t.key ? "#0071e3" : "#8e8e93", background: "none", border: "none", borderBottom: tab === t.key ? "2px solid #0071e3" : "2px solid transparent", cursor: "pointer", transition: "all .15s", marginBottom: -1.5 }}>
            {t.label}
          </button>
        ))}
      </div>
      {/* 탭 콘텐츠 */}
      {tab === "location" && <LocationMap lat={lat} lng={lng} address={address} />}
      {tab === "infra"    && <InfraMap lat={lat} lng={lng} />}
      {tab === "school"   && <SchoolMap lat={lat} lng={lng} />}
      {tab === "market"   && <MarketTab listingId={listingId} />}
    </div>
  );
}
