"use client";

import {
  useState, useEffect, useId, useRef,
  useCallback, useMemo, useReducer,
} from "react";
import { MapPin, GraduationCap, TrendingUp, Loader2 } from "lucide-react";

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

// ── 시세 탭 ──────────────────────────────────────────────────────────────────
interface MarketData {
  avgDeposit: number;
  monthly: { month: string; avgDeposit: number; avgWolse: number; count: number }[];
  period: string;
  listingDeposit: number;
  listingType: string;
}

function roundUpNice(v: number): number {
  if (v <= 0) return 10_000_000;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const nice = n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 3 ? 3 : n <= 5 ? 5 : 10;
  return Math.ceil(v / (nice * mag / 4)) * (nice * mag / 4);
}

function formatYAxis(won: number): string {
  if (won === 0) return "0만";
  const il = Math.floor(won / 100_000_000);
  const rem = won % 100_000_000;
  const cm = Math.floor(rem / 10_000_000);
  if (il > 0 && cm > 0) return `${il}억${cm}천만`;
  if (il > 0) return `${il}억`;
  if (cm > 0) return `${cm}천만`;
  return `${Math.round(won / 10_000).toLocaleString()}만`;
}

function formatManWonTable(won: number): string {
  if (won <= 0) return "-";
  const man = Math.round(won / 10_000);
  return `${man.toLocaleString()}만`;
}

const CHART_H = 180;
const NUM_TICKS = 5;

function MarketTab({ listingId }: { listingId: string }) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/listings/${listingId}/market-price`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("시세 데이터를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10, color: "#aeaeb2" }}>
      <Loader2 size={20} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13 }}>시세 조회 중...</span>
    </div>
  );
  if (error || !data) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#aeaeb2", gap: 8 }}>
      <TrendingUp size={32} strokeWidth={1.2} />
      <p style={{ fontSize: 13, margin: 0 }}>{error || "조회 가능한 시세 데이터가 없습니다."}</p>
    </div>
  );

  const maxDep = Math.max(...data.monthly.map((m) => m.avgDeposit), 1);
  const niceMax = roundUpNice(maxDep * 1.05);
  const ticks = Array.from({ length: NUM_TICKS }, (_, i) => (niceMax / (NUM_TICKS - 1)) * i);
  const ratio = data.avgDeposit > 0 ? Math.round(((data.listingDeposit - data.avgDeposit) / data.avgDeposit) * 100) : null;

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <TrendingUp size={17} strokeWidth={2} style={{ color: "#0071e3" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>인근 시세 추이 ({data.period})</span>
      </div>

      {/* 시세 대비 배너 */}
      {ratio !== null && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", background: ratio > 0 ? "#fff5f5" : "#f0f8f0", borderRadius: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: "#8e8e93" }}>시세 대비 현재 보증금</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: ratio > 0 ? "#c0392b" : "#22a75e" }}>
            {ratio > 0 ? `+${ratio}% ↑ 시세 초과` : ratio < 0 ? `${ratio}% ↓ 시세 이하` : "시세 수준"}
          </span>
        </div>
      )}

      {/* 바차트 */}
      {data.monthly.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex" }}>
            {/* Y축 */}
            <div style={{ width: 44, flexShrink: 0, position: "relative", height: CHART_H, marginBottom: 24 }}>
              {ticks.map((t, i) => (
                <div key={i} style={{ position: "absolute", bottom: `${(i / (NUM_TICKS - 1)) * 100}%`, right: 6, transform: "translateY(50%)", fontSize: 9, color: "#aeaeb2", whiteSpace: "nowrap" }}>
                  {formatYAxis(t)}
                </div>
              ))}
            </div>
            {/* 차트 영역 */}
            <div style={{ flex: 1, position: "relative" }}>
              {/* 격자선 */}
              <div style={{ position: "relative", height: CHART_H }}>
                {ticks.map((_, i) => (
                  <div key={i} style={{ position: "absolute", left: 0, right: 0, bottom: `${(i / (NUM_TICKS - 1)) * 100}%`, borderTop: i === 0 ? "1px solid #d1d1d6" : "1px dashed #e8edf5" }} />
                ))}
                {/* 바 */}
                <div style={{ display: "flex", alignItems: "flex-end", height: "100%", gap: 6, paddingLeft: 2 }}>
                  {data.monthly.map((m) => {
                    const depH = Math.max((m.avgDeposit / niceMax) * CHART_H, 2);
                    const wolH = m.avgWolse > 0 ? Math.max((m.avgWolse / niceMax) * CHART_H, 2) : 0;
                    return (
                      <div key={m.month} style={{ flex: 1, display: "flex", gap: 2, alignItems: "flex-end", height: "100%" }}>
                        <div style={{ flex: 5, height: depH, background: "#93c5fd", borderRadius: "3px 3px 0 0" }} />
                        {wolH > 0
                          ? <div style={{ flex: 1, height: wolH, background: "#3b82f6", borderRadius: "3px 3px 0 0" }} />
                          : <div style={{ flex: 1 }} />
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* X축 월 레이블 */}
              <div style={{ display: "flex", gap: 6, paddingLeft: 2, marginTop: 4 }}>
                {data.monthly.map((m) => (
                  <div key={m.month} style={{ flex: 1, textAlign: "center" }}>
                    <span style={{ fontSize: 10, color: "#8e8e93" }}>{parseInt(m.month.slice(5))}월</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 범례 */}
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 10 }}>
            {[{ color: "#93c5fd", label: "평균보증금" }, { color: "#3b82f6", label: "평균월세" }].map(({ color, label }) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8e8e93" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 테이블 */}
      {data.monthly.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr 0.8fr", padding: "7px 4px", borderBottom: "1.5px solid #e5e5ea" }}>
            {["월", "평균보증금", "평균월세", "건수"].map((h) => (
              <span key={h} style={{ fontSize: 11, color: "#8e8e93", fontWeight: 600 }}>{h}</span>
            ))}
          </div>
          {data.monthly.map((m) => (
            <div key={m.month} style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr 0.8fr", padding: "9px 4px", borderBottom: "1px solid #f0f3fa" }}>
              <span style={{ fontSize: 12, color: "#1d1d1f" }}>{m.month}</span>
              <span style={{ fontSize: 12, color: "#1d1d1f" }}>{formatManWonTable(m.avgDeposit)}</span>
              <span style={{ fontSize: 12, color: "#1d1d1f" }}>{formatManWonTable(m.avgWolse)}</span>
              <span style={{ fontSize: 12, color: "#aeaeb2" }}>{m.count}건</span>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 10, color: "#aeaeb2", marginTop: 12 }}>국토교통부 실거래가 공개데이터 기반. 실제 거래가와 다를 수 있습니다.</p>
    </div>
  );
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      <div id={domId} style={{ width: "100%", height: 437, borderRadius: 14, border: "1px solid #e8edf5", overflow: "hidden" }} />
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef      = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dotsByCat   = useRef<Map<string, { ov: any; shape: HTMLDivElement }[]>>(new Map());
  const placesByCat = useRef<Map<string, PlaceItem[]>>(new Map());
  const [selected, setSelected] = useState<InfraCatCode>("ALL");
  const [items, setItems]       = useState<PlaceItem[]>([]);
  const [loaded, setLoaded]     = useState(0);

  const applyFilter = useCallback((code: InfraCatCode) => {
    const map = mapRef.current; if (!map) return;
    dotsByCat.current.forEach((entries, catCode) => {
      const cat = INFRA_CATS.find((c) => c.code === catCode);
      const vis = code === "ALL" || code === catCode;
      const color = code === "ALL" ? "#c7c7cc" : (cat?.color ?? "#c7c7cc");
      entries.forEach(({ ov, shape }) => {
        ov.setMap(vis ? map : null);
        if (vis) { shape.style.background = color; shape.style.boxShadow = code === "ALL" ? "0 2px 8px rgba(0,0,0,.2)" : `0 2px 8px ${color}88`; }
      });
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
          if (done === INFRA_CATS.length) setLoaded(INFRA_CATS.length);
        }, { location: pos, radius: 500, sort: kakao.maps.services.SortBy.DISTANCE });
      });
    });
    return () => { c(); dots.forEach((entries) => entries.forEach(({ ov }) => ov.setMap(null))); dots.clear(); places.clear(); mapRef.current = null; };
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
      <div style={{ display: "flex", gap: 10, height: 414 }}>
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef  = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dotsRef = useRef<Map<string, { ov: any; shape: HTMLDivElement }[]>>(new Map());
  const [selected, setSelected] = useState<SchoolKey>("ALL");
  const [{ allItems, loaded }, dispatch] = useReducer(
    (_: { allItems: SchoolItem[]; loaded: boolean }, a: { type: "done"; items: SchoolItem[] }) => ({ allItems: a.items, loaded: true }),
    { allItems: [], loaded: false },
  );
  const listItems = useMemo(() => selected === "ALL" ? allItems : allItems.filter((s) => s.type === selected), [allItems, selected]);

  const applyFilter = useCallback((key: SchoolKey) => {
    const map = mapRef.current; if (!map) return;
    dotsRef.current.forEach((entries, type) => {
      const conf = SCHOOL_TYPES.find((t) => t.key === type);
      const vis = key === "ALL" || key === type;
      const color = key === "ALL" ? "#c7c7cc" : (conf?.color ?? "#c7c7cc");
      entries.forEach(({ ov, shape }) => {
        ov.setMap(vis ? map : null);
        if (vis) { shape.style.background = color; shape.style.boxShadow = key === "ALL" ? "0 2px 8px rgba(0,0,0,.2)" : `0 2px 8px ${color}88`; }
      });
    });
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
    });
    return () => { c(); dots.forEach((entries) => entries.forEach(({ ov }) => ov.setMap(null))); dots.clear(); mapRef.current = null; };
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
