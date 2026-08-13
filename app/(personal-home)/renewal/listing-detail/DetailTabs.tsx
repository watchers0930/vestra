"use client";

import { useState, useEffect } from "react";
import s from "./listing-detail.module.css";
import { LocationMap, InfraMap, SchoolMap } from "@/app/(app)/listings/[id]/components/ListingInfoTabs";

type TabId = "map" | "infra" | "school" | "price";

interface Props {
  region: string;
  dong: string;
  aptName: string;
  lat: number | null;
  lng: number | null;
}

function formatEok(won: number): string {
  if (!won) return "-";
  if (won >= 100_000_000) { const v = (won / 100_000_000).toFixed(1); return `${v.endsWith(".0") ? v.slice(0, -2) : v}억`; }
  return `${Math.floor(won / 10_000)}만`;
}

export default function DetailTabs({ region, dong, aptName, lat, lng }: Props) {
  const [tab, setTab] = useState<TabId>("map");
  const [priceRows, setPriceRows] = useState<{ month: string; count: number; avg: number }[]>([]);
  const hasCoord = lat != null && lng != null;

  // 시세 (지역 실거래에서 동일 단지/동 월별 집계)
  useEffect(() => {
    if (tab !== "price" || priceRows.length > 0) return;
    fetch(`/api/listings/apartments?region=${encodeURIComponent(region)}&limit=80`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = (d.items ?? []).filter((it: any) => it.aptName === aptName || it.dong === dong);
        const byMonth = new Map<string, { sum: number; n: number }>();
        items.forEach((it) => {
          const m = String(it.dealDate).slice(0, 7);
          const cur = byMonth.get(m) ?? { sum: 0, n: 0 };
          cur.sum += it.dealAmount; cur.n += 1; byMonth.set(m, cur);
        });
        setPriceRows(
          [...byMonth.entries()].map(([month, v]) => ({ month, count: v.n, avg: Math.round(v.sum / v.n) }))
            .sort((a, b) => a.month.localeCompare(b.month)),
        );
      })
      .catch(() => setPriceRows([]));
  }, [tab, region, aptName, dong, priceRows.length]);

  const noCoord = (
    <div className={s.mapPlaceholder}>
      <div className={s.mapPlaceholderInner}>
        <span style={{ color: "#888", fontSize: 14 }}>좌표 정보 없음</span>
      </div>
    </div>
  );

  return (
    <>
      <div className={s.listingTabs}>
        <button className={`${s.tabBtn} ${tab === "map" ? s.active : ""}`} onClick={() => setTab("map")}>위치</button>
        <button className={`${s.tabBtn} ${tab === "infra" ? s.active : ""}`} onClick={() => setTab("infra")}>인프라</button>
        <button className={`${s.tabBtn} ${tab === "school" ? s.active : ""}`} onClick={() => setTab("school")}>학군</button>
        <button className={`${s.tabBtn} ${tab === "price" ? s.active : ""}`} onClick={() => setTab("price")}>시세</button>
      </div>

      <div className={s.listingMapWrap}>
        {/* 위치·인프라·학군 — 베스트라 앱 형식(ListingInfoTabs) 그대로 재사용 */}
        {tab === "map" && (hasCoord ? <LocationMap lat={lat!} lng={lng!} address={`${region} ${dong} ${aptName}`} /> : noCoord)}
        {tab === "infra" && (hasCoord ? <InfraMap lat={lat!} lng={lng!} /> : noCoord)}
        {tab === "school" && (hasCoord ? <SchoolMap lat={lat!} lng={lng!} /> : noCoord)}

        {/* 시세 — 지역 실거래 월별 집계 */}
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
