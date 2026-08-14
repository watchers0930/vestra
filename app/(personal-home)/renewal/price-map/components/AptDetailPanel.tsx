"use client";

import s from "../price-map-renewal.module.css";
import { formatMapPrice } from "@/app/(map)/price-map/lib/formatMapPrice";
import type { AptData, PriceMapTradeType } from "@/app/(map)/price-map/types";

interface Props {
  apt: AptData;
  tradeType: PriceMapTradeType;
  officialPriceLabel: string;
  onClose: () => void;
  onRisk: () => void;
  onForecast: () => void;
}

/** 아파트 상세 슬라이드 패널 (실데이터) */
export default function AptDetailPanel({ apt, tradeType, officialPriceLabel, onClose, onRisk, onForecast }: Props) {
  const isUp = (apt.change ?? 0) >= 0;
  const age = apt.year ? new Date().getFullYear() - apt.year : null;
  const pricePerPyeong = apt.area ? Math.round((apt.deposit ?? apt.price) / apt.area) : null;

  return (
    <>
      <div className={s.aptRoadview}>
        <div className={s.aptRoadviewBg} />
        <div className={s.aptRoadviewLabel}>{apt.dong}</div>
        <button className={s.aptCloseBtn} onClick={onClose}>✕</button>
      </div>
      <div className={s.aptHead}>
        <div className={s.aptNameRow}>
          <div className={s.aptName}>{apt.name}</div>
          {apt.change !== null && (
            <span className={`${s.aptChgBadge} ${isUp ? s.acbUp : s.acbDn}`}>
              {isUp ? "▲ +" : "▼ "}{apt.change}%
            </span>
          )}
        </div>
        <div className={s.aptSub}>{apt.dong} · {apt.area ? `${apt.area}평형` : "-"}{apt.year ? ` · ${apt.year}년 건축` : ""}</div>
      </div>
      <div className={s.aptInfoGrid}>
        <div className={s.aptInfoTile}>
          <div className={s.aitLabel}>{tradeType === "전세" ? "전세가" : "매매 시세"}</div>
          <div className={s.aitVal}>{formatMapPrice(apt, tradeType)}</div>
          <div className={s.aitSub}>{pricePerPyeong ? `${pricePerPyeong.toLocaleString()}만원/평` : "-"}</div>
        </div>
        <div className={s.aptInfoTile}>
          <div className={s.aitLabel}>면적</div>
          <div className={s.aitVal}>{apt.area ? `${apt.area}평` : "-"}</div>
          <div className={s.aitSub}>전용면적</div>
        </div>
        <div className={s.aptInfoTile}>
          <div className={s.aitLabel}>건축년도</div>
          <div className={s.aitVal}>{apt.year ? `${apt.year}년` : "-"}</div>
          <div className={s.aitSub}>{age !== null ? `건축 ${age}년차` : "건축연차"}</div>
        </div>
        <div className={s.aptInfoTile}>
          <div className={s.aitLabel}>공시가격</div>
          <div className={s.aitVal}>{officialPriceLabel || "조회중..."}</div>
          <div className={s.aitSub}>국토부 기준</div>
        </div>
      </div>
      <div className={s.aptBtns}>
        <button className={s.aptRiskBtn} onClick={onRisk}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          위험도 분석
        </button>
        <button className={s.aptForecastBtn} onClick={onForecast}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          시세전망
        </button>
      </div>
    </>
  );
}
