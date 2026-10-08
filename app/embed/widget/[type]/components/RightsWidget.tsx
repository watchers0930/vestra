"use client";

import { useRef, useState } from "react";
import { WidgetShell } from "./WidgetShell";
import styles from "../embed.module.css";

interface Factor {
  category: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
}
interface RightsData {
  grade: string;
  gradeLabel: string;
  totalScore: number;
  mortgageRatio: number;
  summary: string;
  factors: Factor[];
  isRegistry: boolean;
}

/** 안전점수(100=안전) → 배지 색 */
function scoreLevel(score: number): "lo" | "md" | "hi" {
  if (score >= 80) return "lo";
  if (score >= 60) return "md";
  return "hi";
}
/** factor 심각도 → 점 색 */
function sevLevel(sev: Factor["severity"]): "lo" | "md" | "hi" {
  if (sev === "critical" || sev === "high") return "hi";
  if (sev === "medium") return "md";
  return "lo";
}

export function RightsWidget({ theme, accent }: { theme: "light" | "dark"; accent: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<RightsData | null>(null);

  async function analyze(file: File) {
    setLoading(true);
    setErr("");
    setData(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/embed/rights", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) setErr(json.error || "분석에 실패했습니다.");
      else setData(json);
    } catch {
      setErr("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    void analyze(file);
  }

  return (
    <WidgetShell
      type="rights"
      title="등기부 권리분석"
      theme={theme}
      accent={accent}
      source="인터넷등기소 텍스트 PDF 기준"
    >
      <label className={styles.drop}>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onPick}
          disabled={loading}
          style={{ display: "none" }}
        />
        {loading ? (
          <span>분석 중…</span>
        ) : (
          <>
            <strong>{fileName || "등기부등본 PDF 올리기"}</strong>
            <span>인터넷등기소 발급 텍스트 PDF (최대 10MB) · 개인정보는 저장·반환하지 않습니다</span>
          </>
        )}
      </label>

      {err && <div className={styles.err}>{err}</div>}

      {data && (
        <div className={styles.result}>
          <span className={`${styles.badge} ${styles[scoreLevel(data.totalScore)]}`}>
            {data.gradeLabel} · {data.grade}등급
          </span>
          <div className={styles.bigRow}>
            <span className={styles.bigLabel}>안전점수</span>
            <span className={styles.big}>{data.totalScore}점</span>
          </div>
          {data.mortgageRatio > 0 && (
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>근저당 비율</span>
                <span className={styles.statVal}>{data.mortgageRatio}%</span>
              </div>
            </div>
          )}
          {data.summary && <div className={styles.note}>{data.summary}</div>}
          {data.factors.length > 0 && (
            <ul className={styles.factors}>
              {data.factors.map((f, i) => (
                <li key={i} className={styles.factor}>
                  <span
                    className={styles.sev}
                    style={{
                      background:
                        sevLevel(f.severity) === "hi"
                          ? "#dc2626"
                          : sevLevel(f.severity) === "md"
                            ? "#d97706"
                            : "#0f9d6b",
                    }}
                  />
                  <span>
                    <strong>{f.category}</strong> · {f.description}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </WidgetShell>
  );
}
