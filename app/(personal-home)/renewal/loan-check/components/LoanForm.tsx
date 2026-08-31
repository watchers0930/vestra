"use client";

import { Banknote } from "lucide-react";
import s from "../loan-check.module.css";
import { formatKRW, formatNumber, parseNumber } from "@/lib/format";
import type { LoanForm as LoanFormData } from "@/app/(app)/loan-check/hooks/useLoanCheckData";

interface Props {
  form: LoanFormData;
  update: <K extends keyof LoanFormData>(key: K, value: LoanFormData[K]) => void;
  loading: boolean;
  onSubmit: () => void;
}

export default function LoanForm({ form, update, loading, onSubmit }: Props) {
  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <span className={s.cardIcon}><Banknote size={18} /></span>
        <div>
          <p className={s.cardTitle}>물건 · 소득 정보</p>
          <p className={s.cardDesc}>입력값 기준으로 은행별 가심사를 계산합니다</p>
        </div>
      </div>

      <div className={s.formGrid}>
        <div className={s.field}>
          <label htmlFor="deposit" className={s.fieldLabel}>전세 보증금</label>
          <input id="deposit" type="text" inputMode="numeric" className={s.fieldInput}
            value={formatNumber(form.deposit)}
            onChange={(e) => update("deposit", parseNumber(e.target.value))} />
          <p className={s.fieldHint}>{formatKRW(form.deposit)}</p>
        </div>

        <div className={s.field}>
          <label htmlFor="propertyPrice" className={s.fieldLabel}>매매 시세</label>
          <input id="propertyPrice" type="text" inputMode="numeric" className={s.fieldInput}
            value={formatNumber(form.propertyPrice)}
            onChange={(e) => update("propertyPrice", parseNumber(e.target.value))} />
          <p className={s.fieldHint}>{formatKRW(form.propertyPrice)}</p>
        </div>

        <div className={s.field}>
          <label htmlFor="annualIncome" className={s.fieldLabel}>연소득</label>
          <input id="annualIncome" type="text" inputMode="numeric" className={s.fieldInput}
            value={formatNumber(form.annualIncome)}
            onChange={(e) => update("annualIncome", parseNumber(e.target.value))} />
          <p className={s.fieldHint}>{formatKRW(form.annualIncome)}</p>
        </div>

        <div className={s.fieldRow}>
          <div className={s.field}>
            <label htmlFor="propertyType" className={s.fieldLabel}>물건 유형</label>
            <select id="propertyType" className={s.fieldSelect}
              value={form.propertyType}
              onChange={(e) => update("propertyType", e.target.value)}>
              <option value="아파트">아파트</option>
              <option value="빌라/다세대">빌라/다세대</option>
              <option value="오피스텔">오피스텔</option>
            </select>
          </div>
          <div className={s.field}>
            <label htmlFor="existingLoans" className={s.fieldLabel}>기존 대출 잔액</label>
            <input id="existingLoans" type="text" inputMode="numeric" className={s.fieldInput}
              value={formatNumber(form.existingLoans)}
              onChange={(e) => update("existingLoans", parseNumber(e.target.value))} />
          </div>
        </div>

        <label className={s.checkLabel}>
          <input type="checkbox" className={s.checkbox}
            checked={form.isFirstHome}
            onChange={(e) => update("isFirstHome", e.target.checked)} />
          생애최초 주택 구입
        </label>

        <button className={s.submitBtn} onClick={onSubmit} disabled={loading}>
          {loading ? "시뮬레이션 중..." : "대출 가심사 시작"}
        </button>
      </div>
    </div>
  );
}
