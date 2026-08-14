"use client";

import { useMemo } from "react";
import s from "../tax.module.css";
import { calculateTransferTax } from "@/lib/tax-calculator";
import { formatEokMan } from "./taxFormat";

interface ScenarioRow {
  label: string;
  holdLabel: string;
  holdingYears: number;
  livingYears: number;
  note: string;
}

const SCENARIOS: ScenarioRow[] = [
  { label: "즉시 매도", holdLabel: "1년 미만", holdingYears: 0, livingYears: 0, note: "단기세율" },
  { label: "2년 후 매도", holdLabel: "2년", holdingYears: 2, livingYears: 2, note: "일반세율 전환" },
  { label: "5년 후 매도", holdLabel: "5년", holdingYears: 5, livingYears: 5, note: "—" },
  { label: "10년 후 매도", holdLabel: "10년", holdingYears: 10, livingYears: 10, note: "장특공제 최대" },
];

export default function ScenarioPanel({
  acqPrice,
  transPrice,
}: {
  acqPrice: number;
  transPrice: number;
}) {
  const rows = useMemo(() => {
    // 다주택(3주택) 기준으로 계산 → 보유기간별 장특공제/세율 차이가 표에 그대로 드러나도록
    // (1주택 비과세는 결과가 0으로 수렴해 시나리오 비교 의미가 약해지므로 다주택 기준 예시)
    return SCENARIOS.map((sc) => {
      const r = calculateTransferTax({
        acquisitionPrice: acqPrice,
        transferPrice: transPrice,
        holdingYears: sc.holdingYears,
        livingYears: sc.livingYears,
        houseCount: 3,
        isAdjusted: false,
      });
      const total = r.totalTax ?? r.tax ?? 0;
      const deduction = r.deductionRate !== undefined ? `${(r.deductionRate * 100).toFixed(0)}%` : "0%";
      return { ...sc, total, deduction };
    });
  }, [acqPrice, transPrice]);

  const minTotal = Math.min(...rows.map((r) => r.total));

  return (
    <div className={s.taxCard}>
      <h3 className={s.taxCardTitle}>
        <svg viewBox="0 0 24 24" stroke="#7c3aed">
          <path d="M8 3v18M3 8h5M16 21V3M21 16h-5" />
        </svg>
        매도 시점별 세부담 비교
      </h3>
      <p style={{ fontSize: "12.5px", color: "#888", lineHeight: 1.7, marginBottom: "16px" }}>
        동일 물건(취득 {formatEokMan(acqPrice)} → 양도 {formatEokMan(transPrice)}, 다주택 기준)을 보유기간별로
        매도했을 때의 예상 세액입니다. 취득세 탭 매매가·양도세 탭 양도가를 조정하면 실시간 재계산됩니다.
      </p>
      <table className={s.scnTable}>
        <thead>
          <tr>
            <th>시나리오</th>
            <th style={{ textAlign: "right" }}>보유기간</th>
            <th style={{ textAlign: "right" }}>장특공제</th>
            <th style={{ textAlign: "right" }}>예상 양도세</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isBest = r.total === minTotal;
            return (
              <tr key={r.label} className={isBest ? s.scnBestRow : ""}>
                <td>{isBest ? <b>{r.label}</b> : r.label}</td>
                <td className={s.amt}>{r.holdLabel}</td>
                <td className={s.amt}>{r.deduction}</td>
                <td className={s.amt}>{formatEokMan(r.total)}</td>
                <td>{isBest ? <span className={s.scnBest}>세부담 최소</span> : r.note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className={`${s.resultNote} ${s.noteBlue}`} style={{ marginTop: 0 }}>
        장기보유특별공제는 보유·거주 요건을 함께 충족할수록 커집니다. 10년 이상 보유·거주 시 최대 80% 공제로
        세부담이 크게 줄어듭니다.
      </div>
    </div>
  );
}
