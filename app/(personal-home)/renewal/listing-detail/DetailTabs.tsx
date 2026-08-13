"use client";

import { useState, useEffect, useMemo } from "react";
import s from "./listing-detail.module.css";
import { KakaoMarkersMap, type MapMarker } from "@/app/(app)/listings/components/KakaoMarkersMap";

type TabId = "map" | "infra" | "school" | "price";

interface Props {
  region: string;
  dong: string;
  aptName: string;
  lat: number | null;
  lng: number | null;
}

interface Place { name: string; cat: string; distance: number; lat: number; lng: number; }

const INFRA_CATS: { code: string; label: string }[] = [
  { code: "SW8", label: "지하철" },
  { code: "CS2", label: "편의점" },
  { code: "MT1", label: "마트" },
  { code: "CE7", label: "카페" },
  { code: "FD6", label: "음식점" },
  { code: "HP8", label: "병원" },
];
const SCHOOL_KINDS = ["초등학교", "중학교", "고등학교"];

// 카카오 SDK 준비 대기
function whenKakaoReady(cb: () => void) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const t0 = Date.now();
  const timer = setInterval(() => {
    if (w.kakao?.maps?.services?.Places) { clearInterval(timer); cb(); }
    else if (Date.now() - t0 > 12000) clearInterval(timer);
  }, 250);
}

function formatEok(won: number): string {
  if (!won) return "-";
  if (won >= 100_000_000) { const v = (won / 100_000_000).toFixed(1); return `${v.endsWith(".0") ? v.slice(0, -2) : v}억`; }
  return `${Math.floor(won / 10_000)}만`;
}

export default function DetailTabs({ region, dong, aptName, lat, lng }: Props) {
  const [tab, setTab] = useState<TabId>("map");
  const [infraFilter, setInfraFilter] = useState<string>("ALL");
  const [schoolFilter, setSchoolFilter] = useState<string>("ALL");
  const [infra, setInfra] = useState<Place[]>([]);
  const [schools, setSchools] = useState<Place[]>([]);
  const [priceRows, setPriceRows] = useState<{ month: string; count: number; avg: number }[]>([]);

  const hasCoord = lat != null && lng != null;

  // 인프라 검색
  useEffect(() => {
    if (tab !== "infra" || !hasCoord || infra.length > 0) return;
    whenKakaoReady(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      const ps = new w.kakao.maps.services.Places();
      const center = new w.kakao.maps.LatLng(lat, lng);
      const acc: Place[] = [];
      let done = 0;
      INFRA_CATS.forEach((c) => {
        ps.categorySearch(c.code, (data: unknown[], status: string) => {
          if (status === w.kakao.maps.services.Status.OK) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (data as any[]).slice(0, 5).forEach((p) => acc.push({
              name: p.place_name, cat: c.label, distance: Number(p.distance) || 0,
              lat: parseFloat(p.y), lng: parseFloat(p.x),
            }));
          }
          if (++done === INFRA_CATS.length) { acc.sort((a, b) => a.distance - b.distance); setInfra([...acc]); }
        }, { location: center, radius: 800, sort: w.kakao.maps.services.SortBy.DISTANCE });
      });
    });
  }, [tab, hasCoord, lat, lng, infra.length]);

  // 학군 검색
  useEffect(() => {
    if (tab !== "school" || !hasCoord || schools.length > 0) return;
    whenKakaoReady(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      const ps = new w.kakao.maps.services.Places();
      const center = new w.kakao.maps.LatLng(lat, lng);
      ps.categorySearch("SC4", (data: unknown[], status: string) => {
        if (status !== w.kakao.maps.services.Status.OK) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list: Place[] = (data as any[]).map((p) => {
          const kind = SCHOOL_KINDS.find((k) => (p.category_name || "").includes(k) || (p.place_name || "").includes(k)) || "기타";
          return { name: p.place_name, cat: kind, distance: Number(p.distance) || 0, lat: parseFloat(p.y), lng: parseFloat(p.x) };
        }).filter((x: Place) => SCHOOL_KINDS.includes(x.cat));
        list.sort((a, b) => a.distance - b.distance);
        setSchools(list);
      }, { location: center, radius: 3000, sort: w.kakao.maps.services.SortBy.DISTANCE });
    });
  }, [tab, hasCoord, lat, lng, schools.length]);

  // 시세 (지역 실거래에서 동일 단지 월별 집계)
  useEffect(() => {
    if (tab !== "price" || priceRows.length > 0) return;
    fetch(`/api/listings/apartments?region=${encodeURIComponent(region)}&limit=80`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = (d.items ?? []).filter((it: any) => it.aptName === aptName || it.dong === dong);
        const byMonth = new Map<string, { sum: number; n: number }>();
        items.forEach((it) => {
          const m = String(it.dealDate).slice(0, 7); // YYYY.MM
          const cur = byMonth.get(m) ?? { sum: 0, n: 0 };
          cur.sum += it.dealAmount; cur.n += 1; byMonth.set(m, cur);
        });
        const rows = [...byMonth.entries()]
          .map(([month, v]) => ({ month, count: v.n, avg: Math.round(v.sum / v.n) }))
          .sort((a, b) => a.month.localeCompare(b.month));
        setPriceRows(rows);
      })
      .catch(() => setPriceRows([]));
  }, [tab, region, aptName, dong, priceRows.length]);

  const infraShown = useMemo(
    () => (infraFilter === "ALL" ? infra : infra.filter((p) => p.cat === INFRA_CATS.find((c) => c.code === infraFilter)?.label)),
    [infra, infraFilter],
  );
  const schoolShown = useMemo(
    () => (schoolFilter === "ALL" ? schools : schools.filter((p) => p.cat === schoolFilter)),
    [schools, schoolFilter],
  );

  const selfMarker: MapMarker[] = hasCoord ? [{ id: "self", lat: lat!, lng: lng!, label: aptName }] : [];
  const infraMarkers: MapMarker[] = [...selfMarker, ...infraShown.map((p, i) => ({ id: `i${i}`, lat: p.lat, lng: p.lng, label: p.cat }))];
  const schoolMarkers: MapMarker[] = [...selfMarker, ...schoolShown.map((p, i) => ({ id: `s${i}`, lat: p.lat, lng: p.lng, label: p.name.slice(0, 6) }))];

  const dist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`);

  return (
    <>
      <div className={s.listingTabs}>
        <button className={`${s.tabBtn} ${tab === "map" ? s.active : ""}`} onClick={() => setTab("map")}>위치</button>
        <button className={`${s.tabBtn} ${tab === "infra" ? s.active : ""}`} onClick={() => setTab("infra")}>인프라</button>
        <button className={`${s.tabBtn} ${tab === "school" ? s.active : ""}`} onClick={() => setTab("school")}>학군</button>
        <button className={`${s.tabBtn} ${tab === "price" ? s.active : ""}`} onClick={() => setTab("price")}>시세</button>
      </div>

      <div className={s.listingMapWrap}>
        {/* 위치 */}
        {tab === "map" && (
          <div className={s.tabMap}>
            <div style={{ height: 300 }}>
              {hasCoord
                ? <KakaoMarkersMap markers={selfMarker} activeId="self" onMarkerClick={() => {}} panTo={{ lat: lat!, lng: lng! }} />
                : <div className={s.mapPlaceholder}><div className={s.mapPlaceholderInner}><span style={{ color: "#888", fontSize: 14 }}>좌표 정보 없음</span></div></div>}
            </div>
            <div className={s.mapAddrRow}>
              <svg className={s.mapAddrPin} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" />
              </svg>
              <span className={s.mapAddrText}>{region} {dong} {aptName}</span>
            </div>
          </div>
        )}

        {/* 인프라 */}
        {tab === "infra" && (
          <div>
            <div className={s.tabFilterRow}>
              <button className={`${s.tabFilterChip} ${infraFilter === "ALL" ? s.active : ""}`} onClick={() => setInfraFilter("ALL")}>전체</button>
              {INFRA_CATS.map((c) => (
                <button key={c.code} className={`${s.tabFilterChip} ${infraFilter === c.code ? s.active : ""}`} onClick={() => setInfraFilter(c.code)}>{c.label}</button>
              ))}
            </div>
            <div className={s.tabMapLayout}>
              <div className={s.tabListPanel}>
                <div className={s.tabListHeader}>주변 시설 {infraShown.length}곳</div>
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {infraShown.length === 0 ? (
                    <p style={{ fontSize: 11, color: "#aeaeb2", textAlign: "center", padding: "24px 0" }}>검색 중…</p>
                  ) : infraShown.map((p, i) => (
                    <div key={i} style={{ padding: "9px 12px", borderBottom: "1px solid #f4f5f9", fontSize: 12 }}>
                      <span style={{ color: "#2e4bd8", fontWeight: 600, marginRight: 6 }}>{p.cat}</span>
                      {p.name}<span style={{ color: "#aeaeb2", marginLeft: 6 }}>{dist(p.distance)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={s.tabMapPanel}>
                <div style={{ height: 300 }}>
                  {hasCoord && <KakaoMarkersMap markers={infraMarkers} activeId="self" onMarkerClick={() => {}} panTo={{ lat: lat!, lng: lng! }} />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 학군 */}
        {tab === "school" && (
          <div>
            <div className={s.tabFilterRow}>
              <button className={`${s.tabFilterChip} ${schoolFilter === "ALL" ? s.active : ""}`} onClick={() => setSchoolFilter("ALL")}>전체</button>
              {SCHOOL_KINDS.map((k) => (
                <button key={k} className={`${s.tabFilterChip} ${schoolFilter === k ? s.active : ""}`} onClick={() => setSchoolFilter(k)}>{k.replace("학교", "")}</button>
              ))}
            </div>
            <div className={s.tabMapLayout}>
              <div className={s.tabListPanel}>
                <div className={s.tabListHeader}>주변 학교 {schoolShown.length}곳</div>
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {schoolShown.length === 0 ? (
                    <p style={{ fontSize: 11, color: "#aeaeb2", textAlign: "center", padding: "24px 0" }}>검색 중…</p>
                  ) : schoolShown.map((p, i) => (
                    <div key={i} style={{ padding: "9px 12px", borderBottom: "1px solid #f4f5f9", fontSize: 12 }}>
                      <span style={{ color: "#16a34a", fontWeight: 600, marginRight: 6 }}>{p.cat.replace("학교", "")}</span>
                      {p.name}<span style={{ color: "#aeaeb2", marginLeft: 6 }}>{dist(p.distance)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={s.tabMapPanel}>
                <div style={{ height: 300 }}>
                  {hasCoord && <KakaoMarkersMap markers={schoolMarkers} activeId="self" onMarkerClick={() => {}} panTo={{ lat: lat!, lng: lng! }} />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 시세 */}
        {tab === "price" && (
          <div className={s.tabPrice}>
            <div className={s.tabContentInner}>
              <div className={s.priceTrendHeader}>{aptName} 인근 실거래 추이</div>
              <div className={s.priceTableWrap}>
                <table className={s.priceTable}>
                  <thead><tr><th>월</th><th>평균거래가</th><th>건수</th></tr></thead>
                  <tbody>
                    {priceRows.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: "center", color: "#aeaeb2", padding: "20px 0" }}>집계 중…</td></tr>
                    ) : priceRows.map((r) => (
                      <tr key={r.month}><td>{r.month}</td><td className={s.priceCol}>{formatEok(r.avg)}</td><td>{r.count}건</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={s.priceDisclaimer}>국토교통부 실거래가 공개데이터 기반. 실제 거래가와 다를 수 있습니다.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
