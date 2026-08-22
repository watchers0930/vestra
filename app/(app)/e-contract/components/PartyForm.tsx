"use client";

import { SignaturePad } from "./SignaturePad";
import type { Party } from "../hooks/useContractForm";

/** 주민번호 앞자리 포맷: 숫자만 → "YYMMDD-G" (뒷 6자리는 받지 않음) */
function formatRrn(v: string): string {
  const digits = v.replace(/[^0-9]/g, "").slice(0, 7);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6, 7)}`;
}

const inputCls = "w-full border border-[#dfe2ec] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2e4bd8] bg-white";
const labelCls = "block text-xs font-semibold text-[#3a3f55] mb-1.5";

export function PartyForm({
  title,
  accent,
  party,
  onChange,
}: {
  title: string;
  accent: string;
  party: Party;
  onChange: (key: keyof Party, value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[#e5e5e7] p-4 space-y-3">
      <h3 className="text-sm font-bold" style={{ color: accent }}>{title}</h3>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>이름</label>
          <input className={inputCls} value={party.name} onChange={(e) => onChange("name", e.target.value)} placeholder="홍길동" />
        </div>
        <div>
          <label className={labelCls}>전화번호</label>
          <input className={inputCls} value={party.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="010-1234-5678" inputMode="tel" />
        </div>
      </div>

      <div>
        <label className={labelCls}>생년월일 + 성별 <span className="text-[#aeb2bf] font-normal">(뒷자리 1자리만)</span></label>
        <input className={inputCls} value={party.rrn} onChange={(e) => onChange("rrn", formatRrn(e.target.value))} placeholder="890101-1" inputMode="numeric" maxLength={8} />
      </div>

      <SignaturePad label={title} value={party.sign} onChange={(v) => onChange("sign", v)} />
    </div>
  );
}
