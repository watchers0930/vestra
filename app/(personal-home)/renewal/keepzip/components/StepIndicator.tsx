"use client";

import s from "../keepzip-renewal.module.css";
import { JOURNEY_STEPS, type JourneyView } from "@/lib/keepzip/journey-types";

const VIEW_ORDER: JourneyView[] = ["compose", "review", "track"];

/** 상단 6단계 진행 표시 — 현재 뷰 기준으로 완료/진행/대기 상태를 칠한다. */
export function StepIndicator({ view }: { view: JourneyView }) {
  const cur = VIEW_ORDER.indexOf(view);
  return (
    <div className={s.stepBar}>
      {JOURNEY_STEPS.map((st) => {
        const idx = VIEW_ORDER.indexOf(st.view);
        const state = idx < cur ? "done" : idx === cur ? "active" : "pending";
        return (
          <div
            key={st.step}
            className={`${s.stepItem} ${state === "done" ? s.stepDone : ""} ${state === "active" ? s.stepActive : ""}`}
          >
            <span className={s.stepDot}>{state === "done" ? "✓" : st.step}</span>
            <span className={s.stepLabel}>{st.label}</span>
          </div>
        );
      })}
    </div>
  );
}
