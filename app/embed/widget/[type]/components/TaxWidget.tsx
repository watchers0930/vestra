"use client";

import { useState } from "react";
import { WidgetShell } from "./WidgetShell";
import { formatKRW } from "../lib/format";
import styles from "../embed.module.css";

interface TaxData {
  price: number;
  houseCount: number;
  tax: number;
  localEduTax: number;
  specialTax: number;
  totalTax: number;
  rate: number;
  label: string;
  details?: string;
}

export function TaxWidget({ theme, accent }: { theme: "light" | "dark"; accent: string }) {
  const [price, setPrice] = useState("");
  const [houseCount, setHouseCount] = useState("1");
  const [adjusted, setAdjusted] = useState(false);
  const [firstHome, setFirstHome] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<TaxData | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const p = parseInt(price.replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(p) || p <= 0) {
      setErr("매매가(만원)를 입력해주세요.");
      return;
    }
    setLoading(true);
    setErr("");
    setData(null);
    try {
      const qs = new URLSearchParams({
        price: String(p),
        houseCount,
        adjusted: String(adjusted),
        firstHome: String(firstHome),
      });
      const res = await fetch(`/api/embed/tax?${qs}`);
      const json = await res.json();
      if (!res.ok) setErr(json.error || "계산에 실패했습니다.");
      else setData(json);
    } catch {
      setErr("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WidgetShell
      type="tax"
      title="취득세 계산기"
      theme={theme}
      accent={accent}
      source="지방세법 세율 기준 · 참고용"
    >
      <form className={styles.form} onSubmit={run}>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>매매가 (만원)</label>
            <input
              className={styles.input}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="numeric"
              placeholder="예: 80000"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>보유 주택 수</label>
            <select
              className={styles.select}
              value={houseCount}
              onChange={(e) => setHouseCount(e.target.value)}
            >
              <option value="1">1주택</option>
              <option value="2">2주택</option>
              <option value="3">3주택</option>
              <option value="4">4주택 이상</option>
            </select>
          </div>
        </div>
        <div className={styles.checks}>
          <label className={styles.check}>
            <input type="checkbox" checked={adjusted} onChange={(e) => setAdjusted(e.target.checked)} />
            조정대상지역
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={firstHome} onChange={(e) => setFirstHome(e.target.checked)} />
            생애최초 구입
          </label>
        </div>
        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? "계산 중…" : "취득세 계산"}
        </button>
      </form>

      {err && <div className={styles.err}>{err}</div>}

      {data && (
        <div className={styles.result}>
          <div className={styles.addr}>
            {formatKRW(data.price)} · {data.label} · 세율 {data.rate}%
          </div>
          <div className={styles.bigRow}>
            <span className={styles.bigLabel}>총 취득세</span>
            <span className={styles.big}>{formatKRW(data.totalTax)}</span>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>취득세</span>
              <span className={styles.statVal}>{formatKRW(data.tax)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>지방교육세</span>
              <span className={styles.statVal}>{formatKRW(data.localEduTax)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>농특세</span>
              <span className={styles.statVal}>{formatKRW(data.specialTax)}</span>
            </div>
          </div>
          {data.details && <div className={styles.note}>{data.details}</div>}
        </div>
      )}
    </WidgetShell>
  );
}
