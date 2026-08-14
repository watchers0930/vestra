"use client";

import { useState, useMemo } from "react";
import s from "../tax.module.css";
import { calculateAcquisitionTax } from "@/lib/tax-calculator";
import { ManInput, HouseCount, CheckOpt } from "./TaxFields";
import { heroManwon, formatManwon } from "./taxFormat";

export default function AcquisitionPanel({
  price,
  setPrice,
}: {
  price: number;
  setPrice: (v: number) => void;
}) {
  const [houseCount, setHouseCount] = useState(1);
  const [isAdjusted, setIsAdjusted] = useState(false);
  const [isFirst, setIsFirst] = useState(true);

  const r = useMemo(
    () => calculateAcquisitionTax({ price, houseCount, isAdjusted, isFirstHome: isFirst }),
    [price, houseCount, isAdjusted, isFirst]
  );

  const total = r.totalTax ?? r.tax;
  const hero = heroManwon(total);
  const effRate = price > 0 ? ((total / price) * 100).toFixed(2) : "0.00";

  return (
    <div className={s.taxGrid}>
      {/* 입력 */}
      <div className={s.taxCard}>
        <h3 className={s.taxCardTitle}>
          <svg viewBox="0 0 24 24" stroke="#2e4bd8">
            <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" />
          </svg>
          취득세 계산
        </h3>
        <div className={s.field}>
          <div className={s.fieldLabel}>취득가액 (매매가)</div>
          <ManInput value={price} onChange={setPrice} />
        </div>
        <div className={s.field}>
          <div className={s.fieldLabel}>
            보유 주택수 <span style={{ fontWeight: 400, color: "#999" }}>(매수 후 기준)</span>
          </div>
          <HouseCount count={houseCount} onChange={setHouseCount} max={4} variant="acq" />
        </div>
        <div className={s.field}>
          <div className={s.fieldLabel}>추가 옵션</div>
          <div className={s.optRow}>
            <CheckOpt checked={isAdjusted} onChange={setIsAdjusted} label="조정대상지역" />
            <CheckOpt checked={isFirst} onChange={setIsFirst} label="생애최초 주택" />
          </div>
        </div>
      </div>

      {/* 결과 */}
      <div className={s.taxCard}>
        <h3 className={s.taxCardTitle}>계산 결과</h3>
        <div className={s.resultHero} style={{ background: "linear-gradient(148deg,#0c1527,#141820)" }}>
          <div className={s.rhLabel}>{r.label} 취득세 합계</div>
          <div className={s.rhAmount}>
            {hero.value}
            <small>{hero.unit}</small>
          </div>
        </div>
        <div className={s.rline}>
          <span className={s.rlK}>취득세 ({(r.rate * 100).toFixed(1)}%)</span>
          <span className={s.rlV}>{formatManwon(r.tax)}</span>
        </div>
        {r.localEduTax !== undefined && (
          <div className={s.rline}>
            <span className={s.rlK}>지방교육세</span>
            <span className={s.rlV}>{formatManwon(r.localEduTax)}</span>
          </div>
        )}
        <div className={s.rline}>
          <span className={s.rlK}>농어촌특별세</span>
          <span className={s.rlV}>
            {r.specialTax && r.specialTax > 0 ? formatManwon(r.specialTax) : "비과세 (85㎡ 이하)"}
          </span>
        </div>
        <div className={`${s.rline} ${s.total}`}>
          <span className={s.rlK}>실효세율</span>
          <span className={s.rlV}>{effRate}%</span>
        </div>
        <div className={`${s.resultNote} ${s.noteBlue}`}>{r.details}</div>
      </div>
    </div>
  );
}
