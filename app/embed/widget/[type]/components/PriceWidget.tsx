"use client";

import { useState } from "react";
import { WidgetShell } from "./WidgetShell";
import { DaumPostcodeModal } from "@/components/keepzip/DaumPostcodeModal";
import { formatKRW, formatManShort, formatDate } from "../lib/format";
import styles from "../embed.module.css";

export const priceMeta = {
  type: "price",
  title: "실거래가 시세 조회",
  source: "국토교통부 실거래가 기반",
};

interface PriceData {
  address: string;
  period: string;
  estimatedPrice: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  transactionCount: number;
  trend: { pct: number; up: boolean } | null;
  perArea: number | null;
  jeonseRatio: number | null;
  lastUpdated: string;
}

const TYPES = [
  { v: "아파트", l: "아파트" },
  { v: "빌라", l: "빌라·연립" },
  { v: "오피스텔", l: "오피스텔" },
  { v: "단독주택", l: "단독·다가구" },
];

/** 시세 조회 본문(폼+결과) — 셸 없이 BundleWidget 탭에도 끼울 수 있다 */
export function PriceBody({ address: initial = "" }: { address?: string }) {
  const [address, setAddress] = useState(initial);
  const [type, setType] = useState("아파트");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<PriceData | null>(null);
  const [postcodeOpen, setPostcodeOpen] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (address.trim().length < 3) {
      setErr("주소를 3자 이상 입력해주세요.");
      return;
    }
    setLoading(true);
    setErr("");
    setData(null);
    try {
      const qs = new URLSearchParams({ address: address.trim(), type });
      const res = await fetch(`/api/embed/price?${qs}`);
      const json = await res.json();
      if (!res.ok) setErr(json.error || "조회에 실패했습니다.");
      else setData(json);
    } catch {
      setErr("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className={styles.form} onSubmit={run}>
        <div className={styles.field}>
          <label className={styles.label}>주소</label>
          <input
            className={styles.input}
            value={address}
            readOnly
            onClick={() => setPostcodeOpen(true)}
            placeholder="주소 검색 (클릭)"
            style={{ cursor: "pointer" }}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>주거 유형</label>
          <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t.v} value={t.v}>
                {t.l}
              </option>
            ))}
          </select>
        </div>
        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? "조회 중…" : "시세 조회"}
        </button>
      </form>

      {err && <div className={styles.err}>{err}</div>}

      {data && (
        <div className={styles.result}>
          <div className={styles.addr}>
            {data.address} · {data.period} · 거래 {data.transactionCount}건
          </div>
          <div className={styles.bigRow}>
            <span className={styles.bigLabel}>추정 시세</span>
            <span className={styles.big}>{formatKRW(data.estimatedPrice)}</span>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>평균</span>
              <span className={styles.statVal}>{formatKRW(data.avgPrice)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>최저~최고</span>
              <span className={styles.statVal}>
                {formatKRW(data.minPrice)}~{formatKRW(data.maxPrice)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>추이</span>
              <span className={styles.statVal}>
                {data.trend ? `${data.trend.up ? "▲" : "▼"} ${data.trend.pct}%` : "-"}
              </span>
            </div>
            {data.perArea != null && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>㎡당</span>
                <span className={styles.statVal}>{formatManShort(data.perArea)}</span>
              </div>
            )}
            {data.jeonseRatio != null && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>전세가율</span>
                <span className={styles.statVal}>{data.jeonseRatio}%</span>
              </div>
            )}
          </div>
          <div className={styles.source}>기준일 {formatDate(data.lastUpdated)}</div>
        </div>
      )}

      {postcodeOpen && (
        <DaumPostcodeModal
          onComplete={(r) => setAddress(r.jibunAddress)}
          onClose={() => setPostcodeOpen(false)}
        />
      )}
    </>
  );
}

export function PriceWidget({
  theme,
  accent,
  address,
}: {
  theme: "light" | "dark";
  accent: string;
  address: string;
}) {
  return (
    <WidgetShell {...priceMeta} theme={theme} accent={accent}>
      <PriceBody address={address} />
    </WidgetShell>
  );
}
