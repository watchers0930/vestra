"use client";

import {
  useState, useEffect, useId, useRef,
  useCallback, useMemo, useReducer,
} from "react";
import { MapPin, GraduationCap, TrendingUp } from "lucide-react";

type TabKey = "location" | "infra" | "school" | "market";
const TABS: { key: TabKey; label: string }[] = [
  { key: "location", label: "위치" },
  { key: "infra",    label: "인프라" },
  { key: "school",   label: "학군" },
  { key: "market",   label: "시세" },
];

export interface ListingInfoTabsProps {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

// ── Kakao SDK 대기 유틸 ──────────────────────────────────────────────────────
function waitKakao(cb: () => void): () => void {
  let dead = false;
  function go() { if (!dead) cb(); }
  if (window.kakao?.maps?.Map) { go(); return () => { dead = true; }; }
  if (window.kakao?.maps?.load) { window.kakao.maps.load(go); return () => { dead = true; }; }
  const t0 = Date.now();
  const iv = setInterval(() => {
    if (dead) { clearInterval(iv); return; }
    if (window.kakao?.maps?.Map) { clearInterval(iv); go(); }
    else if (window.kakao?.maps?.load) { clearInterval(iv); window.kakao.maps.load(go); }
    else if (Date.now() - t0 > 15000) clearInterval(iv);
  }, 200);
  return () => { dead = true; clearInterval(iv); };
}

// ── 위치 지도 ────────────────────────────────────────────────────────────────
function LocationMap({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const uid = useId();
  const domId = `kmap-loc-${uid.replace(/:/g, "")}`;
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const c = waitKakao(() => {
      const el = document.getElementById(domId);
      if (!el || mapRef.current) return;
      const kakao = window.kakao;
      const pos = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(el, { center: pos, level: 3 });
      mapRef.current = map;
      setTimeout(() => map.relayout(), 100);
      new ResizeObserver(() => map.relayout()).observe(el);
      const pin = document.createElement("div");
      const shape = document.createElement("div");
      Object.assign(shape.style, { width: "22px", height: "22px", borderRadius: "50% 50% 50% 0", background: "#0F2547", transform: "rotate(-45deg)", boxShadow: "0 3px 10px rgba(15,37,71,.55)", border: "2.5px solid #fff", position: "relative" });
      const dot = document.createElement("div");
      Object.assign(dot.style, { width: "7px", height: "7px", borderRadius: "50%", background: "#fff", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
      shape.appendChild(dot);
      pin.appendChild(shape);
      new kakao.maps.CustomOverlay({ map, position: pos, content: pin, yAnchor: 1.15, zIndex: 10 });
    });
    return () => { c(); mapRef.current = null; };
  }, [domId, lat, lng]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <MapPin size={14} strokeWidth={1.5} color="#0071e3" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>건물 위치</span>
      </div>
      <p style={{ fontSize: 12, color: "#6e6e73", margin: "0 0 10px" }}>{address}</p>
      <div id={domId} style={{ width: "100%", height: 380, borderRadius: 14, border: "1px solid #e8edf5", overflow: "hidden" }} />
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

function InfraMap({ lat, lng }: { lat: number; lng: number }) {
  const uid   = useId();
  const domId = `kmap-infra-${uid.replace(/:/g, "")}`;
  const mapRef      = useRef<any>(null);
  const dotsByCat   = useRef<Map<string, any[]>>(new Map());
  const placesByCat = useRef<Map<string, PlaceItem[]>>(new Map());
  const [selected, setSelected] = useState<InfraCatCode>("ALL");
  const [items, setItems]       = useState<PlaceItem[]>([]);
  const [loaded, setLoaded]     = useState(0);

  const applyFilter = useCallback((code: InfraCatCode) => {
    const map = mapRef.current; if (!map) return;
    dotsByCat.current.forEach((ovs, cat) => {
      const vis = code === "ALL" || code === cat;
      ovs.forEach((o) => o.setMap(vis ? map : null));
    });
  }, []);

  function handleSelect(code: InfraCatCode) {
    setSelected(code); applyFilter(code);
    if (code === "ALL") {
      const all: PlaceItem[] = [];
      INFRA_CATS.forEach((c) => (placesByCat.current.get(c.code) ?? []).forEach((p) => all.push(p)));
      setItems(all);
    } else setItems(placesByCat.current.get(code) ?? []);
  }

  useEffect(() => {
    const dots = dotsByCat.current; const places = placesByCat.current;
    const c = waitKakao(() => {
      const el = document.getElementById(domId); if (!el || mapRef.current) return;
      const kakao = window.kakao;
      const pos = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(el, { center: pos, level: 4 });
      mapRef.current = map;
      setTimeout(() => map.relayout(), 100);
      new ResizeObserver(() => map.relayout()).observe(el);
      const pinEl = document.createElement("div");
      Object.assign(pinEl.style, { width: "13px", height: "13px", borderRadius: "50%", background: "#0F2547", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(15,37,71,.5)" });
      new kakao.maps.CustomOverlay({ map, position: pos, content: pinEl, yAnchor: 0.5, zIndex: 10 });
      const ps = new kakao.maps.services.Places();
      let done = 0;
      INFRA_CATS.forEach((cat) => {
        dots.set(cat.code, []); places.set(cat.code, []);
        ps.categorySearch(cat.code, (data: any[], status: any) => {
          done++;
          if (status === kakao.maps.services.Status.OK) {
            data.slice(0, 5).forEach((p) => {
              const pPos = new kakao.maps.LatLng(p.y, p.x);
              const dotEl = document.createElement("div");
              Object.assign(dotEl.style, { width: "9px", height: "9px", borderRadius: "50%", background: cat.color, border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,.25)" });
              const ov = new kakao.maps.CustomOverlay({ map, position: pPos, content: dotEl, yAnchor: 0.5, zIndex: 2 });
              dots.get(cat.code)!.push(ov);
              const d = parseInt(p.distance);
              places.get(cat.code)!.push({ name: p.place_name, distance: d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`, catCode: cat.code, lat: parseFloat(p.y), lng: parseFloat(p.x) });
            });
          }
          if (done === INFRA_CATS.length) setLoaded(INFRA_CATS.length);
        }, { location: pos, radius: 500, sort: kakao.maps.services.SortBy.DISTANCE });
      });
    });
    return () => { c(); dots.forEach((os) => os.forEach((o) => o.setMap(null))); dots.clear(); places.clear(); mapRef.current = null; };
  }, [domId, lat, lng]);

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
      <div style={{ display: "flex", gap: 10, height: 360 }}>
        <div style={{ width: 140, flexShrink: 0, borderRadius: 12, border: "1px solid #e8edf5", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #eef1f8", flexShrink: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>{selected === "ALL" ? "전체 시설" : `${cat?.name ?? ""} (${items.length})`}</p>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {items.length === 0
              ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><p style={{ fontSize: 11, color: "#aeaeb2" }}>로딩 중...</p></div>
              : items.map((item, i) => {
                const ic = INFRA_CATS.find((c) => c.code === item.catCode);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "8px 12px", borderBottom: "1px solid #f0f3fa", cursor: "pointer" }}
                    onClick={() => mapRef.current?.panTo(new window.kakao.maps.LatLng(item.lat, item.lng))}>
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
          <div id={domId} style={{ width: "100%", height: "100%" }} />
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

function SchoolMap({ lat, lng }: { lat: number; lng: number }) {
  const uid   = useId();
  const domId = `kmap-school-${uid.replace(/:/g, "")}`;
  const mapRef  = useRef<any>(null);
  const dotsRef = useRef<Map<string, any[]>>(new Map());
  const [selected, setSelected] = useState<SchoolKey>("ALL");
  const [{ allItems, loaded }, dispatch] = useReducer(
    (_: { allItems: SchoolItem[]; loaded: boolean }, a: { type: "done"; items: SchoolItem[] }) => ({ allItems: a.items, loaded: true }),
    { allItems: [], loaded: false },
  );
  const listItems = useMemo(() => selected === "ALL" ? allItems : allItems.filter((s) => s.type === selected), [allItems, selected]);

  const applyFilter = useCallback((key: SchoolKey) => {
    const map = mapRef.current; if (!map) return;
    dotsRef.current.forEach((os, type) => { const vis = key === "ALL" || key === type; os.forEach((o) => o.setMap(vis ? map : null)); });
  }, []);
  function handleSelect(key: SchoolKey) { setSelected(key); applyFilter(key); }

  useEffect(() => {
    const dots = dotsRef.current;
    const c = waitKakao(() => {
      const el = document.getElementById(domId); if (!el || mapRef.current) return;
      const kakao = window.kakao;
      const pos = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(el, { center: pos, level: 5 });
      mapRef.current = map;
      setTimeout(() => map.relayout(), 100);
      new ResizeObserver(() => map.relayout()).observe(el);
      const pinEl = document.createElement("div");
      Object.assign(pinEl.style, { width: "12px", height: "12px", borderRadius: "50%", background: "#0F2547", border: "3px solid #fff", boxShadow: "0 2px 6px rgba(15,37,71,.5)" });
      new kakao.maps.CustomOverlay({ map, position: pos, content: pinEl, yAnchor: 0.5, zIndex: 10 });
      SCHOOL_TYPES.forEach((t) => dots.set(t.key, []));
      const ps = new kakao.maps.services.Places();
      const found: Record<string, SchoolItem> = {};
      ps.categorySearch("SC4", (data: any[], status: any) => {
        if (status === kakao.maps.services.Status.OK) {
          for (const p of data) {
            const type = schType(p.category_name ?? ""); if (!type || found[type]) continue;
            const conf = SCHOOL_TYPES.find((t) => t.key === type)!;
            const dist = parseInt(p.distance, 10);
            const school: SchoolItem = { name: p.place_name, type, color: conf.color, distance: dist <= 800 ? `도보 ${Math.max(1, Math.round(dist / 67))}분` : `버스 ${Math.max(1, Math.round(dist / 250))}분`, lat: parseFloat(p.y), lng: parseFloat(p.x) };
            found[type] = school;
            const dotEl = document.createElement("div");
            Object.assign(dotEl.style, { width: "9px", height: "9px", borderRadius: "50%", background: conf.color, border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,.25)" });
            const ov = new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(school.lat, school.lng), content: dotEl, yAnchor: 0.5, zIndex: 2 });
            dots.get(type)!.push(ov);
            if (Object.keys(found).length === 3) break;
          }
        }
        dispatch({ type: "done", items: Object.values(found).sort((a, b) => SCHOOL_TYPES.findIndex((t) => t.key === a.type) - SCHOOL_TYPES.findIndex((t) => t.key === b.type)) });
      }, { location: pos, radius: 3000, size: 15, sort: kakao.maps.services.SortBy.DISTANCE });
    });
    return () => { c(); dots.forEach((os) => os.forEach((o) => o.setMap(null))); dots.clear(); mapRef.current = null; };
  }, [domId, lat, lng]);

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
      <div style={{ display: "flex", gap: 10, height: 360 }}>
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
                  onClick={() => mapRef.current?.panTo(new window.kakao.maps.LatLng(item.lat, item.lng))}>
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
          <div id={domId} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <p style={{ fontSize: 11, color: "#aeaeb2", marginTop: 8 }}>학군 정보는 참고용이며, 실제 배정과 다를 수 있습니다.</p>
    </div>
  );
}

// ── 메인 탭 컴포넌트 ─────────────────────────────────────────────────────────
export function ListingInfoTabs({ address, latitude, longitude }: ListingInfoTabsProps) {
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
      {tab === "market"   && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#aeaeb2", gap: 12 }}>
          <TrendingUp size={36} strokeWidth={1.2} />
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>시세 분석 준비 중</p>
          <p style={{ fontSize: 12, margin: 0 }}>실거래가 기반 시세 정보를 곧 제공합니다</p>
        </div>
      )}
    </div>
  );
}
