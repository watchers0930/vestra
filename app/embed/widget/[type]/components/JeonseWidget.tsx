"use client";

import { useState } from "react";
import { WidgetShell } from "./WidgetShell";
import { formatKRW, formatDate } from "../lib/format";
import styles from "../embed.module.css";

export const jeonseMeta = {
  type: "jeonse-safety",
  title: "전세 안전진단 (깡통전세)",
  source: "국토교통부 실거래가 기반",
};

interface JeonseData {
  address: string;
  estimatedPrice: number;
  deposit: number;
  jeonseRatio: number;
  marketJeonseRatio: number | null;
  risk: { level: "lo" | "md" | "hi"; label: string };
  note: string | null;
  lastUpdated: string;
}

const TYPES = [
  { v: "아파트", l: "아파트" },
  { v: "빌라", l: "빌라·연립" },
  { v: "오피스텔", l: "오피스텔" },
  { v: "단독주택", l: "단독·다가구" },
];

/** 전세 안전진단 본문(폼+결과) */
export function JeonseBody({ address: initial = "" }: { address?: string }) {
  const [address, setAddress] = useState(initial);
  const [deposit, setDeposit] = useState("");
  const [type, setType] = useState("아파트");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<JeonseData | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (address.trim().length < 3) {
      setErr("주소를 3자 이상 입력해주세요.");
      return;
    }
    const dep = parseInt(deposit.replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(dep) || dep <= 0) {
      setErr("전세보증금(만원)을 입력해주세요.");
      return;
    }
    setLoading(true);
    setErr("");
    setData(null);
    try {
      const qs = new URLSearchParams({ address: address.trim(), deposit: String(dep), type });
      const res = await fetch(`/api/embed/jeonse-safety?${qs}`);
      const json = await res.json();
      if (!res.ok) setErr(json.error || "진단에 실패했습니다.");
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
            onChange={(e) => setAddress(e.target.value)}
            placeholder="예: 서울시 강남구 역삼동"
          />
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>전세보증금 (만원)</label>
            <input
              className={styles.input}
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              inputMode="numeric"
              placeholder="예: 30000"
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
        </div>
        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? "진단 중…" : "안전진단"}
        </button>
      </form>

      {err && <div className={styles.err}>{err}</div>}

      {data && (
        <div className={styles.result}>
          <div className={styles.addr}>{data.address}</div>
          <span className={`${styles.badge} ${styles[data.risk.level]}`}>{data.risk.label}</span>
          <div className={styles.bigRow}>
            <span className={styles.bigLabel}>전세가율</span>
            <span className={styles.big}>{data.jeonseRatio}%</span>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>추정 시세</span>
              <span className={styles.statVal}>{formatKRW(data.estimatedPrice)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>보증금</span>
              <span className={styles.statVal}>{formatKRW(data.deposit)}</span>
            </div>
            {data.marketJeonseRatio != null && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>지역 평균</span>
                <span className={styles.statVal}>{data.marketJeonseRatio}%</span>
              </div>
            )}
          </div>
          {data.note && <div className={styles.note}>{data.note}</div>}
          <div className={styles.source}>기준일 {formatDate(data.lastUpdated)}</div>
        </div>
      )}
    </>
  );
}

export function JeonseWidget({
  theme,
  accent,
  address,
}: {
  theme: "light" | "dark";
  accent: string;
  address: string;
}) {
  return (
    <WidgetShell {...jeonseMeta} theme={theme} accent={accent}>
      <JeonseBody address={address} />
    </WidgetShell>
  );
}
