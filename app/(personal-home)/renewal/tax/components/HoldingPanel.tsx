"use client";

import { useState, useMemo, useCallback } from "react";
import s from "../tax.module.css";
import { calculateHoldingTax } from "@/lib/tax-calculator";
import { ManInput, HouseCount, CheckOpt } from "./TaxFields";
import { heroManwon, formatManwon, formatEokMan } from "./taxFormat";
import { AddressSearchField, EMPTY_ADDRESS, composeAddress, type AddressValue } from "@/components/common/AddressSearchField";

export default function HoldingPanel({ initialAssessed, initialAddress }: { initialAssessed?: number; initialAddress?: string } = {}) {
  const [assessed, setAssessed] = useState(initialAssessed ?? 600000000);
  const [houseCount, setHouseCount] = useState(1);
  const [isAdjusted, setIsAdjusted] = useState(false);
  const [address, setAddress] = useState(initialAddress ?? "");
  const [addr, setAddr] = useState<AddressValue>(EMPTY_ADDRESS);
  const [loading, setLoading] = useState(false);
  const [priceLabel, setPriceLabel] = useState<string | null>(
    initialAddress && initialAssessed ? "조회된 공시가격이 적용되었습니다" : null
  );

  // 주소(+집합건물 동/호)로 공시가격 조회 → 보유세 과세표준 자동 적용
  const lookupPrice = useCallback(async (v: AddressValue) => {
    const base = v.jibunAddress || v.roadAddress;
    if (!base) return;
    setLoading(true);
    setPriceLabel(null);
    try {
      const params = new URLSearchParams({ address: base });
      if (v.isBuilding && /^\d+$/.test(v.dong.trim())) params.set("dong", v.dong.trim());
      if (v.isBuilding && /^\d+$/.test(v.ho.trim())) params.set("ho", v.ho.trim());
      const res = await fetch(`/api/official-price?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const price =
          data.aptPrice?.price || data.housePrice?.price || data.landPrice?.totalPrice || 0;
        if (price > 0) {
          setAssessed(price);
          setPriceLabel(`${data.year}년 공시가격 자동 적용`);
        } else {
          setPriceLabel("공시가격을 찾을 수 없습니다");
        }
      }
    } catch {
      /* graceful fallback */
    }
    setLoading(false);
  }, []);

  const r = useMemo(
    () => calculateHoldingTax({ assessedValue: assessed, houseCount, isAdjusted }),
    [assessed, houseCount, isAdjusted]
  );

  const hero = heroManwon(r.totalTax);

  return (
    <div className={s.taxGrid}>
      {/* 입력 */}
      <div className={s.taxCard}>
        <h3 className={s.taxCardTitle}>
          <svg viewBox="0 0 24 24" stroke="#10b981">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          보유세 계산
        </h3>
        <div className={s.field}>
          <div className={s.fieldLabel}>
            주소로 공시가격 조회 <span className={s.fieldHint}>✓ 공시가격 자동 적용</span>
          </div>
          <AddressSearchField
            value={addr}
            onChange={(v) => {
              setAddr(v);
              setAddress(composeAddress(v));
              // 비집합건물은 주소 선택 즉시 조회. 집합건물은 동/호 입력 후 아래 버튼으로 조회.
              if (!v.isBuilding) lookupPrice(v);
            }}
          />
          {addr.isBuilding && (addr.jibunAddress || addr.roadAddress) && (
            <button
              type="button"
              onClick={() => lookupPrice(addr)}
              style={{ marginTop: 8, padding: "9px 16px", borderRadius: 8, background: "var(--brand-primary)", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
            >
              동·호 반영 공시가격 조회
            </button>
          )}
          {loading && <p className={s.priceLoading}>공시가격 조회 중…</p>}
          {priceLabel && (
            <p className={priceLabel.includes("찾을 수 없") ? s.priceError : s.priceApplied}>
              {priceLabel}
            </p>
          )}
        </div>
        <div className={s.field}>
          <div className={s.fieldLabel}>공시가격</div>
          <ManInput value={assessed} onChange={setAssessed} />
        </div>
        <div className={s.field}>
          <div className={s.fieldLabel}>보유 주택수</div>
          <HouseCount count={houseCount} onChange={setHouseCount} max={4} variant="hold" />
        </div>
        <div className={s.field}>
          <div className={s.fieldLabel}>추가 옵션</div>
          <div className={s.optRow}>
            <CheckOpt checked={isAdjusted} onChange={setIsAdjusted} label="조정대상지역" />
          </div>
        </div>
      </div>

      {/* 결과 */}
      <div className={s.taxCard}>
        <h3 className={s.taxCardTitle}>계산 결과 (연간)</h3>
        <div className={s.resultHero} style={{ background: "linear-gradient(148deg,#071a0e,#0c2718)" }}>
          <div className={s.rhLabel}>연간 보유세 합계</div>
          <div className={s.rhAmount}>
            {hero.value}
            <small>{hero.unit}</small>
          </div>
        </div>
        <div className={s.rline}>
          <span className={s.rlK}>재산세</span>
          <span className={s.rlV}>{formatManwon(r.propertyTax)}</span>
        </div>
        <div className={s.rline}>
          <span className={s.rlK}>종합부동산세</span>
          <span className={s.rlV}>{formatManwon(r.comprehensiveTax)}</span>
        </div>
        <div className={s.rline}>
          <span className={s.rlK}>공제금액 ({houseCount === 1 ? "1세대 1주택" : "다주택"})</span>
          <span className={s.rlV}>{formatEokMan(r.details.deduction)}</span>
        </div>
        <div className={`${s.rline} ${s.total}`}>
          <span className={s.rlK}>과세표준</span>
          <span className={s.rlV}>{formatEokMan(r.details.taxableValue)}</span>
        </div>
        <div className={`${s.resultNote} ${s.noteGreen}`}>
          {r.comprehensiveTax === 0
            ? "공시가격이 공제금액 이하로 종합부동산세가 부과되지 않습니다. 고령·장기보유 세액공제 요건 충족 시 추가 감면이 가능합니다."
            : "1세대 1주택 종부세 기본공제가 적용되었습니다. 고령·장기보유 세액공제 요건 충족 시 추가 감면이 가능합니다."}
        </div>
      </div>
    </div>
  );
}
