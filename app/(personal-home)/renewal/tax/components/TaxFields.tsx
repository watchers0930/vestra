"use client";

import s from "../tax.module.css";
import { parseManInput, toManInput } from "./taxFormat";

/** 만원 단위 숫자 입력 (시안 .num-input) */
export function ManInput({
  value,
  onChange,
  unit = "만 원",
}: {
  value: number;
  onChange: (won: number) => void;
  unit?: string;
}) {
  return (
    <div className={s.numInput}>
      <input
        type="text"
        inputMode="numeric"
        value={toManInput(value)}
        onChange={(e) => onChange(parseManInput(e.target.value))}
      />
      <span className={s.numUnit}>{unit}</span>
    </div>
  );
}

/** 년 단위 정수 입력 */
export function YearInput({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className={s.numInput} style={{ flex: 1 }}>
      <input
        type="text"
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 0;
          onChange(max !== undefined ? Math.min(n, max) : n);
        }}
      />
      <span className={s.numUnit}>년</span>
    </div>
  );
}

/** 보유 주택수 버튼 그룹 (시안 .hcount) */
export function HouseCount({
  count,
  onChange,
  max = 4,
  variant = "acq",
}: {
  count: number;
  onChange: (n: number) => void;
  max?: number;
  variant?: "acq" | "hold" | "trans";
}) {
  const onClass = variant === "hold" ? s.onG : variant === "trans" ? s.onO : s.on;
  return (
    <div className={s.hcount}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={`${s.hcountBtn} ${count === n ? onClass : ""}`}
          onClick={() => onChange(n)}
        >
          {n >= max ? `${max}+주택` : `${n}주택`}
        </button>
      ))}
    </div>
  );
}

/** 체크박스 옵션 (시안 .opt) */
export function CheckOpt({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <span
      className={`${s.opt} ${checked ? s.checked : ""}`}
      onClick={() => onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <span className={s.optBox}>
        <svg viewBox="0 0 10 8">
          <path d="M1 4l3 3 5-6" />
        </svg>
      </span>
      {label}
    </span>
  );
}
