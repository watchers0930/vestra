"use client";

import { useState } from "react";
import s from "../price-map-renewal.module.css";
import ForecastTabs from "./ForecastTabs";
import type { usePredictionData } from "@/app/(app)/prediction/hooks/usePredictionData";
import type { AptData, PriceMapTradeType } from "@/app/(map)/price-map/types";

type FpTab = "dashboard" | "chart" | "compare" | "backtest" | "anomaly";
type Prediction = ReturnType<typeof usePredictionData>;

interface Props {
  open: boolean;
  apt: AptData | null;
  tradeType: PriceMapTradeType;
  prediction: Prediction;
  onClose: () => void;
}

const TABS: { id: FpTab; label: string }[] = [
  { id: "dashboard", label: "대시보드" },
  { id: "chart", label: "차트" },
  { id: "compare", label: "지역비교" },
  { id: "backtest", label: "백테스트" },
  { id: "anomaly", label: "이상탐지" },
];

/** 시세전망 오버레이 — usePredictionData 실데이터 연계 */
export default function ForecastView({ open, apt, tradeType, prediction, onClose }: Props) {
  const [fpTab, setFpTab] = useState<FpTab>("dashboard");
  const { loading, result } = prediction;

  return (
    <div
      className={`${s.forecastOverlay} ${open ? s.open : ""}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={s.forecastPanel}>
        <div className={s.fpHeader}>
          <div className={s.fpTopRow}>
            <span className={s.fpEyebrow}>Price Forecast</span>
            <button className={s.fpClose} onClick={onClose}>✕</button>
          </div>
          <div className={s.fpAptName}>{apt?.name ?? "시세전망"}</div>
          <div className={s.fpAptSub}>
            {apt ? `${apt.dong}${apt.area ? ` · ${apt.area}평형` : ""} · ${tradeType}` : ""}
          </div>
          <div className={s.fpTabs}>
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`${s.fpTab} ${fpTab === t.id ? s.on : ""}`}
                onClick={() => setFpTab(t.id)}
              >{t.label}</button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className={s.fpBody}>
            <p className={s.fpSec}>AI 시세 분석 중…</p>
            <p style={{ fontSize: "12px", color: "#888", lineHeight: 1.7 }}>
              실거래 데이터 수집 → 가격 지수 산출 → AI 시나리오 생성 중입니다.
            </p>
          </div>
        ) : !result ? (
          <div className={s.fpBody}>
            <p className={s.fpSec}>시세전망 데이터가 없습니다.</p>
            <p style={{ fontSize: "12px", color: "#888" }}>해당 물건의 실거래 데이터를 찾지 못했습니다.</p>
          </div>
        ) : (
          <ForecastTabs fpTab={fpTab} prediction={prediction} />
        )}
      </div>
    </div>
  );
}
