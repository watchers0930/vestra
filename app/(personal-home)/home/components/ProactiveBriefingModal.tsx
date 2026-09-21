"use client";

/**
 * AI 능동 인사이트 브리핑 — 모달
 * ────────────────────────────────
 * 등기 변동 등 "지금 챙겨야 할 사건"이 있을 때만 홈 진입 시 자동으로 모달을 띄운다.
 * - 비로그인(401)이면 아무것도 하지 않는다(홈은 공용 랜딩).
 * - 자동 노출 조건: 긴급/주의 신호 또는 미확인 등기 변동이 있을 때만. (사소한 info성만 있으면 안 띄움)
 * - 하루 1회: 닫으면 그날은 다시 뜨지 않는다.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import s from "./ProactiveBriefingModal.module.css";
import type { ProactiveBriefingResponse, SignalSeverity } from "@/lib/proactive/types";

const CACHE_KEY = "vestra_briefing_v1"; // 오늘자 브리핑 데이터 캐시
const SEEN_KEY = "vestra_briefing_seen"; // 오늘 모달을 닫은(본) 날짜

const SEVERITY_LABEL: Record<SignalSeverity, string> = {
  critical: "긴급",
  high: "주의",
  medium: "확인",
  info: "안내",
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 자동으로 모달을 띄울 만한 사건(긴급/주의/등기변동)이 있는가 */
function hasNoteworthy(data: ProactiveBriefingResponse): boolean {
  return data.signals.some(
    (sig) => sig.severity === "critical" || sig.severity === "high" || sig.kind === "registry_alert"
  );
}

export default function ProactiveBriefingModal() {
  const [data, setData] = useState<ProactiveBriefingResponse | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    // 비동기 경계: 이펙트에서 동기적으로 setState가 호출되지 않도록(캐시 히트 시 cascading render 방지)
    await Promise.resolve();

    // 오늘자 캐시가 있으면 재사용(불필요한 조회·자동팝업 반복 방지)
    let cached: ProactiveBriefingResponse | null = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { date: string; data: ProactiveBriefingResponse };
        if (parsed.date === todayStr()) cached = parsed.data;
      }
    } catch {
      /* 캐시 파손 무시 */
    }

    let result = cached;
    if (!result) {
      try {
        const res = await fetch("/api/proactive-briefing", { cache: "no-store" });
        if (!res.ok) return; // 401(비로그인) 포함 — 조용히 종료
        result = (await res.json()) as ProactiveBriefingResponse;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayStr(), data: result }));
        } catch {
          /* 저장 실패 무시 */
        }
      } catch {
        return;
      }
    }

    if (!result) return;
    setData(result);

    // 오늘 이미 봤으면 자동으로 안 띄움
    let seenToday = false;
    try {
      seenToday = localStorage.getItem(SEEN_KEY) === todayStr();
    } catch {
      /* 무시 */
    }
    if (!seenToday && hasNoteworthy(result)) setOpen(true);
  }, []);

  useEffect(() => {
    // load는 async(첫 줄에 await 경계 존재)라 setState가 동기 실행되지 않는다.
    // 정적 분석이 이를 인지 못 하는 false positive이므로 이 라인만 예외 처리.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, todayStr());
    } catch {
      /* 무시 */
    }
  }, []);

  if (!open || !data) return null;

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label="AI 능동 브리핑" onClick={close}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <div className={s.titleRow}>
            <span className={s.badge}>AI 브리핑</span>
            <h2 className={s.title}>지금 챙길 것</h2>
          </div>
          <button type="button" className={s.close} onClick={close} aria-label="닫기">
            ✕
          </button>
        </div>

        <p className={s.headline}>{data.headline}</p>

        <ul className={s.list}>
          {data.signals.map((sig, i) => (
            <li key={i} className={s.item}>
              <span className={`${s.sev} ${s[`sev_${sig.severity}`]}`}>{SEVERITY_LABEL[sig.severity]}</span>
              <div className={s.itemBody}>
                <p className={s.itemTitle}>{sig.title}</p>
                <p className={s.itemDetail}>{sig.detail}</p>
              </div>
              <Link href={sig.actionUrl} className={s.action} onClick={close}>
                {sig.actionLabel}
              </Link>
            </li>
          ))}
        </ul>

        {data.aiUsed && <p className={s.foot}>· 신호 데이터를 근거로 AI가 요약했습니다</p>}
      </div>
    </div>
  );
}
