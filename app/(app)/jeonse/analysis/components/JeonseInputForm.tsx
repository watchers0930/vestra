"use client";

import { Shield, FileText, Loader2 } from "lucide-react";
import { FormInput, SliderInput, TabButtons } from "@/components/forms";
import { propertyTypes } from "../constants";
import type { JeonseFormData } from "../types";

interface Props {
  formData: JeonseFormData;
  setFormData: (data: JeonseFormData) => void;
  loading: boolean;
  onAnalyze: () => void;
}

export function JeonseInputForm({ formData, setFormData, loading, onAnalyze }: Props) {
  const update = (patch: Partial<JeonseFormData>) => setFormData({ ...formData, ...patch });

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "20px",
        boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <h3
        style={{
          display: "flex", alignItems: "center", gap: "7px",
          fontSize: "15px", fontWeight: 700, color: "#1d1d1f",
          letterSpacing: "-0.02em",
        }}
      >
        <FileText size={16} strokeWidth={1.5} style={{ color: "#6e6e73" }} />
        계약 정보 입력
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <FormInput
          label="임대인 (집주인)"
          value={formData.landlordName}
          onChange={(e) => update({ landlordName: e.target.value })}
          placeholder="홍길동"
        />
        <FormInput
          label="임차인 (세입자)"
          value={formData.tenantName}
          onChange={(e) => update({ tenantName: e.target.value })}
          placeholder="김철수"
        />
      </div>

      <FormInput
        label="부동산 주소"
        value={formData.propertyAddress}
        onChange={(e) => update({ propertyAddress: e.target.value })}
        placeholder="서울 강남구 역삼동 123-45 래미안 101동 1502호"
      />

      <div>
        <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#1d1d1f", marginBottom: "8px" }}>
          부동산 유형
        </label>
        <TabButtons
          options={propertyTypes}
          value={formData.propertyType}
          onChange={(v) => update({ propertyType: v })}
        />
      </div>

      <SliderInput
        label="보증금"
        value={formData.deposit}
        onChange={(v) => update({ deposit: v })}
        min={10000000}
        max={2000000000}
        step={10000000}
      />

      <SliderInput
        label="주택 시세 (매매가)"
        value={formData.propertyPrice}
        onChange={(v) => update({ propertyPrice: v })}
        min={100000000}
        max={3000000000}
        step={10000000}
      />

      <SliderInput
        label="선순위 채권액 (근저당 등)"
        value={formData.seniorLiens}
        onChange={(v) => update({ seniorLiens: v })}
        min={0}
        max={2000000000}
        step={10000000}
      />

      <div>
        <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#1d1d1f", marginBottom: "8px" }}>
          지역
        </label>
        <TabButtons
          options={[
            { value: "true", label: "수도권" },
            { value: "false", label: "비수도권" },
          ]}
          value={String(formData.isMetro)}
          onChange={(v) => update({ isMetro: v === "true" })}
        />
      </div>

      <label
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          cursor: "pointer", padding: "10px 14px",
          borderRadius: "10px", border: "1px solid rgba(0,0,0,0.08)",
          background: "#fafafa",
        }}
      >
        <input
          type="checkbox"
          checked={formData.hasJeonseLoan}
          onChange={(e) => update({ hasJeonseLoan: e.target.checked })}
          style={{ width: "15px", height: "15px", accentColor: "#0071e3" }}
        />
        <span style={{ fontSize: "12.5px", color: "#3c3c43" }}>전세자금대출 연계 (HF 보증 판단용)</span>
      </label>

      <FormInput
        label="월세 (없으면 0)"
        type="number"
        value={formData.monthlyRent}
        onChange={(e) => update({ monthlyRent: Number(e.target.value) })}
        placeholder="0"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <FormInput
          label="계약 시작일"
          type="date"
          value={formData.startDate}
          onChange={(e) => update({ startDate: e.target.value })}
        />
        <FormInput
          label="계약 종료일"
          type="date"
          value={formData.endDate}
          onChange={(e) => update({ endDate: e.target.value })}
        />
      </div>

      <button
        onClick={onAnalyze}
        disabled={!formData.propertyAddress || loading}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "14px",
          border: "none",
          background: !formData.propertyAddress || loading ? "rgba(0,0,0,0.07)" : "#0071e3",
          color: !formData.propertyAddress || loading ? "#aeaeb2" : "#fff",
          fontSize: "14px",
          fontWeight: 700,
          cursor: !formData.propertyAddress || loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          boxShadow: !formData.propertyAddress || loading ? "none" : "0 4px 16px rgba(0,113,227,0.30)",
          transition: "all 0.15s",
        }}
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" />분석 중...</>
        ) : (
          <><Shield size={16} strokeWidth={2} />전세 안전 분석</>
        )}
      </button>
    </div>
  );
}
