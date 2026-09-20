"use client";

/**
 * AI 능동 인사이트 브리핑 카드
 * ────────────────────────────
 * 로그인 사용자의 자산·계약·등기감시·구독 상태를 종합해 "지금 신경 쓸 것"을 보여준다.
 * - 비로그인(401)이면 아무것도 렌더하지 않는다(홈은 공용 랜딩).
 * - 하루 1회 자동 조회 + localStorage 캐시. 수동 새로고침 지원.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import s from "./ProactiveBriefingCard.module.css";
import type { ProactiveBriefingResponse, SignalSeverity } from "@/lib/proactive/types";

const CACHE_KEY = "vestra_briefing_v1";

const SEVERITY_LABEL: Record<SignalSeverity, string> = {
  critical: "긴급",
  high: "주의",
  medium: "확인",
  info: "안내",
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ProactiveBriefingCard() {
  const [data, setData] = useState<ProactiveBriefingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  // null=아직 판단 전, false=비로그인(숨김), true=로그인
  const [authed, setAuthed] = useState<boolean | null>(null);

  const fetchBriefing = useCallback(async (force: boolean) => {
    // 캐시 확인 (강제 새로고침이 아니면 오늘자 캐시 사용)
    if (!force) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as { date: string; data: ProactiveBriefingResponse };
          if (cached.date === todayStr()) {
            setData(cached.data);
            setAuthed(true);
            return;
          }
        }
      } catch {
        /* 캐시 파손 무시 */
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/proactive-briefing", { cache: "no-store" });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        setAuthed(true);
        return;
      }
      const json = (await res.json()) as ProactiveBriefingResponse;
      setData(json);
      setAuthed(true);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayStr(), data: json }));
      } catch {
        /* 저장 실패 무시 */
      }
    } catch {
      setAuthed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing(false);
  }, [fetchBriefing]);

  // 비로그인이거나 아직 판단 전이면 렌더 안 함
  if (authed !== true) return null;

  return (
    <section className={s.wrap} aria-label="AI 능동 브리핑">
      <div className={s.head}>
        <div className={s.titleRow}>
          <span className={s.badge}>AI 브리핑</span>
          <h2 className={s.title}>내 부동산, 지금 챙길 것</h2>
        </div>
        <button
          type="button"
          className={s.refresh}
          onClick={() => fetchBriefing(true)}
          disabled={loading}
        >
          {loading ? "분석 중…" : "새로고침"}
        </button>
      </div>

      {loading && !data ? (
        <p className={s.headline}>상황을 분석하고 있습니다…</p>
      ) : data ? (
        <>
          <p className={s.headline}>{data.headline}</p>
          {data.signals.length > 0 ? (
            <ul className={s.list}>
              {data.signals.map((sig, i) => (
                <li key={i} className={s.item}>
                  <span className={`${s.sev} ${s[`sev_${sig.severity}`]}`}>
                    {SEVERITY_LABEL[sig.severity]}
                  </span>
                  <div className={s.itemBody}>
                    <p className={s.itemTitle}>{sig.title}</p>
                    <p className={s.itemDetail}>{sig.detail}</p>
                  </div>
                  <Link href={sig.actionUrl} className={s.action}>
                    {sig.actionLabel}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.empty}>확인이 필요한 자산·계약·등기 이슈가 없습니다. 안심하세요.</p>
          )}
          {data.aiUsed && <p className={s.foot}>· 신호 데이터를 근거로 AI가 요약했습니다</p>}
        </>
      ) : null}
    </section>
  );
}
