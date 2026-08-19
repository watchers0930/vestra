"use client";

/**
 * 모바일 전용 상세 탭.
 * 공용 DetailTabs를 복제하되 인프라 탭만 모바일 전용 MobileInfraMap을 사용한다.
 * 위치/학군/시세는 공용 로직을 그대로 재사용(스타일 변경 없음) — 공용 파일 무변경.
 */

import { useState, useEffect, useRef } from "react";
import s from "../../listing-detail/listing-detail.module.css";
import { LocationMap } from "@/app/(app)/listings/[id]/components/ListingInfoTabs";
import MobileInfraMap from "./MobileInfraMap";
import MobileSchoolMap from "./MobileSchoolMap";

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

export default function MobileDetailTabs({ region, dong, aptName, lat, lng }: Props) {
  const [tab, setTab] = useState<TabId>("map");
  const [priceRows, setPriceRows] = useState<{ month: string; count: number; avg: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // 시세 막대그래프
  useEffect(() => {
    if (tab !== "price" || priceRows.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas?.getContext) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.parentElement?.clientWidth ?? 300;
    const cssH = 200;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const padL = 54, padR = 16, padT = 14, padB = 34;
    const W = cssW - padL - padR, H = cssH - padT - padB;
    const vals = priceRows.map((d) => d.avg);
    const maxV = Math.max(...vals);
    const chartMax = Math.ceil(maxV / 100_000_000) * 100_000_000 + 100_000_000;
    const steps = 4;
    ctx.textAlign = "right";
    ctx.font = "10px -apple-system, sans-serif";
    for (let i = 0; i <= steps; i++) {
      const v = (chartMax / steps) * i;
      const y = padT + H - (H * v) / chartMax;
      ctx.fillStyle = "#aaa";
      ctx.fillText(v === 0 ? "0" : `${(v / 100_000_000).toFixed(0)}억`, padL - 6, y + 3.5);
      ctx.strokeStyle = "#e8eaf0";
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + W, y); ctx.stroke();
    }
    ctx.setLineDash([]);
    const slotW = W / priceRows.length;
    const barW = Math.min(46, slotW * 0.5);
    ctx.textAlign = "center";
    priceRows.forEach((d, i) => {
      const x = padL + slotW * i + slotW / 2;
      const barH = (H * d.avg) / chartMax;
      const barY = padT + H - barH;
      ctx.fillStyle = "#bfdbfe";
      ctx.beginPath();
      ctx.roundRect(x - barW / 2, barY, barW, barH, [4, 4, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#888";
      ctx.fillText(d.month.slice(5), x, padT + H + 16);
    });
  }, [tab, priceRows]);

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
        {/* 위치 — 공용 재사용 / 인프라·학군 — 모바일 전용(좌측 슬라이드 반투명 목록) */}
        {tab === "map" && (hasCoord ? <LocationMap lat={lat!} lng={lng!} address={`${region} ${dong} ${aptName}`} /> : noCoord)}
        {tab === "infra" && (hasCoord ? <MobileInfraMap lat={lat!} lng={lng!} /> : noCoord)}
        {tab === "school" && (hasCoord ? <MobileSchoolMap lat={lat!} lng={lng!} /> : noCoord)}

        {/* 시세 — 지역 실거래 월별 집계 */}
        {tab === "price" && (
          <div className={s.tabPrice}>
            <div className={s.tabContentInner}>
              <div className={s.priceTrendHeader}>{aptName} 인근 실거래 추이</div>
              {priceRows.length > 0 && (
                <>
                  <div className={s.priceChartArea}>
                    <canvas ref={canvasRef} height={200} className={s.priceChartCanvas} />
                  </div>
                  <div className={s.priceLegend}><span className={s.priceLegendDot}></span> 평균거래가</div>
                </>
              )}
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
