"use client";

import { useState, useMemo } from "react";
import s from "../tax.module.css";
import { calculateTransferTax } from "@/lib/tax-calculator";
import { ManInput, YearInput, HouseCount, CheckOpt } from "./TaxFields";
import { heroManwon, formatManwon } from "./taxFormat";

export default function TransferPanel({
  acqPrice,
  setAcqPrice,
}: {
  acqPrice: number;
  setAcqPrice: (v: number) => void;
}) {
  const [transPrice, setTransPrice] = useState(900000000);
  const [holdYears, setHoldYears] = useState(5);
  const [liveYears, setLiveYears] = useState(3);
  const [houseCount, setHouseCount] = useState(1);
  const [isAdjusted, setIsAdjusted] = useState(false);

  const effLive = Math.min(liveYears, holdYears);

  const r = useMemo(
    () =>
      calculateTransferTax({
        acquisitionPrice: acqPrice,
        transferPrice: transPrice,
        holdingYears: holdYears,
        livingYears: effLive,
        houseCount,
        isAdjusted,
      }),
    [acqPrice, transPrice, holdYears, effLive, houseCount, isAdjusted]
  );

  const total = r.totalTax ?? r.tax ?? 0;
  const hero = heroManwon(total);

  return (
    <div className={s.taxGrid}>
      {/* 입력 */}
      <div className={s.taxCard}>
        <h3 className={s.taxCardTitle}>
          <svg viewBox="0 0 24 24" stroke="#f59e0b">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          양도세 계산
        </h3>
        <div className={s.field}>
          <div className={s.fieldLabel}>취득가격</div>
          <ManInput value={acqPrice} onChange={setAcqPrice} />
        </div>
        <div className={s.field}>
          <div className={s.fieldLabel}>양도가격</div>
          <ManInput value={transPrice} onChange={setTransPrice} />
        </div>
        <div className={s.field}>
          <div className={s.fieldLabel} style={{ justifyContent: "flex-start", gap: 0 }}>
            <span style={{ flex: 1 }}>보유기간</span>
            <span style={{ flex: 1, marginLeft: 12 }}>거주기간</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <YearInput value={holdYears} onChange={setHoldYears} />
            <YearInput value={effLive} onChange={setLiveYears} max={holdYears} />
          </div>
        </div>
        <div className={s.field}>
          <div className={s.fieldLabel} style={{ justifyContent: "flex-start", gap: 12 }}>
            <span>보유 주택수</span>
            <CheckOpt checked={isAdjusted} onChange={setIsAdjusted} label="조정대상지역" />
          </div>
          <HouseCount count={houseCount} onChange={setHouseCount} max={3} variant="trans" />
        </div>
      </div>

      {/* 결과 */}
      <div className={s.taxCard}>
        <h3 className={s.taxCardTitle}>계산 결과</h3>
        <div className={s.resultHero} style={{ background: "linear-gradient(148deg,#0f0900,#1a1200)" }}>
          <div className={s.rhLabel}>양도소득세 합계</div>
          <div className={s.rhAmount}>
            {hero.value}
            <small>{hero.unit}</small>
          </div>
        </div>
        <div className={s.rline}>
          <span className={s.rlK}>양도차익</span>
          <span className={s.rlV}>{formatManwon(r.gain ?? 0)}</span>
        </div>
        {r.deductionRate !== undefined && (
          <div className={s.rline}>
            <span className={s.rlK}>장기보유특별공제</span>
            <span className={s.rlV}>{(r.deductionRate * 100).toFixed(0)}%</span>
          </div>
        )}
        <div className={s.rline}>
          <span className={s.rlK}>과세표준</span>
          <span className={s.rlV}>{formatManwon(r.taxableGain ?? 0)}</span>
        </div>
        <div className={s.rline}>
          <span className={s.rlK}>양도소득세</span>
          <span className={s.rlV}>{formatManwon(r.tax ?? 0)}</span>
        </div>
        {r.localIncomeTax !== undefined && (
          <div className={`${s.rline} ${s.total}`}>
            <span className={s.rlK}>지방소득세 (10%)</span>
            <span className={s.rlV}>{formatManwon(r.localIncomeTax)}</span>
          </div>
        )}
        <div className={`${s.resultNote} ${s.noteAmber}`}>{r.details}</div>
      </div>
    </div>
  );
}
