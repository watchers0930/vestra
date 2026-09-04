"use client";

import { useRef } from "react";
import { Shield, FileText, Loader2, UploadCloud, CheckCircle2, User } from "lucide-react";
import { FormInput, TabButtons } from "@/components/forms";
import { propertyTypes } from "../constants";
import type { JeonseFormData } from "../types";

interface Props {
  formData: JeonseFormData;
  setFormData: (data: JeonseFormData) => void;
  loading: boolean;
  registryLoading: boolean;
  parsedOwner: string;
  onAnalyze: () => void;
  onRegistryUpload: (file: File) => void;
}

function formatWon(value: number): string {
  return value > 0 ? value.toLocaleString("ko-KR") : "";
}

function parseWon(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

const MONEY_INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 32px 10px 12px",
  borderRadius: "10px",
  border: "1px solid rgba(0,0,0,0.12)",
  fontSize: "14px",
  fontWeight: 600,
  color: "#1d1d1f",
  background: "#fff",
  textAlign: "right" as const,
  outline: "none",
};

const MONEY_LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#6e6e73",
  marginBottom: "6px",
};

export function JeonseInputForm({ formData, setFormData, loading, registryLoading, parsedOwner, onAnalyze, onRegistryUpload }: Props) {
  const update = (patch: Partial<JeonseFormData>) => setFormData({ ...formData, ...patch });
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onRegistryUpload(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onRegistryUpload(file);
  }

  const hasRegistry = !!parsedOwner || !!formData.propertyAddress;

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

      {/* 등기부등본 업로드 */}
      <div>
        <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#1d1d1f", marginBottom: "8px" }}>
          등기부등본 <span style={{ fontWeight: 400, color: "#6e6e73" }}>(PDF 업로드 시 주소·근저당 자동 입력)</span>
        </label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${hasRegistry ? "#30d158" : "#d2d2d7"}`,
            borderRadius: "12px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
            background: hasRegistry ? "rgba(48,209,88,0.04)" : "#fafafa",
            transition: "all 0.15s",
          }}
        >
          {registryLoading ? (
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--brand-primary)", flexShrink: 0 }} />
          ) : hasRegistry ? (
            <CheckCircle2 size={20} style={{ color: "#30d158", flexShrink: 0 }} />
          ) : (
            <UploadCloud size={20} style={{ color: "#aeaeb2", flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            {registryLoading ? (
              <p style={{ fontSize: "13px", color: "var(--brand-primary)", margin: 0 }}>등기부등본 분석 중...</p>
            ) : hasRegistry ? (
              <>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#30d158", margin: 0 }}>등기부등본 파싱 완료</p>
                {parsedOwner && (
                  <p style={{ fontSize: "11px", color: "#6e6e73", margin: "2px 0 0" }}>소유자: {parsedOwner}</p>
                )}
              </>
            ) : (
              <>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#3d3d3f", margin: 0 }}>등기부등본 PDF 업로드</p>
                <p style={{ fontSize: "11px", color: "#aeaeb2", margin: "2px 0 0" }}>클릭하거나 파일을 여기에 끌어다 놓으세요</p>
              </>
            )}
          </div>
          {hasRegistry && !registryLoading && (
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "#aeaeb2", flexShrink: 0 }}>재업로드</span>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFileChange} />
      </div>

      {/* 소유자(임대인) 표시 */}
      {parsedOwner && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.2)" }}>
          <User size={13} style={{ color: "#30d158", flexShrink: 0 }} />
          <span style={{ fontSize: "12.5px", color: "#1d1d1f" }}>
            등기상 소유자(임대인): <strong>{parsedOwner}</strong>
          </span>
        </div>
      )}

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

      {/* 보증금 / 주택시세 / 선순위채권 3열 입력 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
        <div>
          <label style={MONEY_LABEL_STYLE}>보증금</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              inputMode="numeric"
              value={formatWon(formData.deposit)}
              onChange={(e) => update({ deposit: parseWon(e.target.value) })}
              placeholder="0"
              style={MONEY_INPUT_STYLE}
            />
            <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#aeaeb2", pointerEvents: "none" }}>원</span>
          </div>
        </div>
        <div>
          <label style={MONEY_LABEL_STYLE}>주택시세 (매매가)</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              inputMode="numeric"
              value={formatWon(formData.propertyPrice)}
              onChange={(e) => update({ propertyPrice: parseWon(e.target.value) })}
              placeholder="0"
              style={MONEY_INPUT_STYLE}
            />
            <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#aeaeb2", pointerEvents: "none" }}>원</span>
          </div>
        </div>
        <div>
          <label style={MONEY_LABEL_STYLE}>선순위채권액 (근저당 등)</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              inputMode="numeric"
              value={formatWon(formData.seniorLiens)}
              onChange={(e) => update({ seniorLiens: parseWon(e.target.value) })}
              placeholder="0"
              style={MONEY_INPUT_STYLE}
            />
            <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#aeaeb2", pointerEvents: "none" }}>원</span>
          </div>
        </div>
      </div>

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
          style={{ width: "15px", height: "15px", accentColor: "var(--brand-primary)" }}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          background: !formData.propertyAddress || loading ? "rgba(0,0,0,0.07)" : "var(--brand-primary)",
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
