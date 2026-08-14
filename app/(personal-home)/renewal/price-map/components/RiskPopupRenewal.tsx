"use client";

import s from "../price-map-renewal.module.css";
import type { analyzeRisk } from "@/app/(map)/price-map/lib/analyzeRisk";
import type { AptData } from "@/app/(map)/price-map/types";

interface Props {
  open: boolean;
  popup: { apt: AptData; risk: ReturnType<typeof analyzeRisk> } | null;
  onClose: () => void;
}

const LEVEL_CLASS: Record<string, string> = {
  안전: s.rilSafe,
  주의: s.rilCaution,
  위험: s.rilCaution,
};

/** 위험도 분석 팝업 (실데이터 analyzeRisk 결과) */
export default function RiskPopupRenewal({ open, popup, onClose }: Props) {
  const risk = popup?.risk;
  const apt = popup?.apt;
  // 게이지: 원둘레 163.36 기준, score(안전점수) 만큼 채움
  const CIRC = 163.36;
  const offset = risk ? CIRC - (risk.score / 100) * CIRC : CIRC;

  return (
    <div
      className={`${s.popupOverlay} ${open ? s.open : ""}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={s.riskPopup}>
        <div className={s.rpHeader}>
          <button className={s.rpClose} onClick={onClose}>✕</button>
          <div className={s.rpAptName}>{apt ? `${apt.name} · ${apt.area}평형` : ""}</div>
          <div className={s.rpScoreRow}>
            <div className={s.rpGauge}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="6" />
                <circle cx="32" cy="32" r="26" fill="none" stroke={risk?.color ?? "#f59e0b"} strokeWidth="6" strokeDasharray={CIRC} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 32 32)" />
              </svg>
              <div className={s.rpGaugeNum}>
                <span className={s.rpGaugeN}>{risk?.score ?? "-"}</span>
                <span className={s.rpGaugeL}>점</span>
              </div>
            </div>
            <div>
              <div className={s.rpGrade}>{risk?.grade ?? "-"}</div>
              <div className={s.rpGradeSub}>공공데이터 기반 자동 분석<br />참고용 지표입니다</div>
            </div>
          </div>
        </div>
        <div className={s.rpBody}>
          {risk?.items.map((item) => (
            <div key={item.label} className={s.riskItem}>
              <span className={s.riLabel}>{item.label}</span>
              <span className={s.riVal}>{item.value}</span>
              <span className={`${s.riLevel} ${LEVEL_CLASS[item.level] ?? s.rilCaution}`}>{item.level}</span>
            </div>
          ))}
        </div>
        <div className={s.rpNote}>본 위험도 분석은 시세·연식·평당가 등 공개 지표 기반의 참고 정보입니다. 투자 판단 근거로 사용하지 마세요.</div>
      </div>
    </div>
  );
}
