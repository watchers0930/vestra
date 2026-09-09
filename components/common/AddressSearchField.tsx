"use client";

import { useState, useCallback } from "react";
import { Search, MapPin } from "lucide-react";
import { DaumPostcodeModal } from "@/components/keepzip/DaumPostcodeModal";
import type { PostcodeResult } from "@/lib/keepzip/daum-postcode";

/**
 * 주소 입력 통일 값 — 모든 주소 입력처가 이 형태를 공유한다.
 * - 다음(Daum) 우편번호 검색으로 도로명/지번/우편번호/건물명/집합건물여부를 채운다.
 * - 집합건물(아파트·공동주택)이면 동/호를 별도로 입력받는다.
 * - 집합건물이 아니면 상세주소(detail)를 자유 입력한다.
 */
export interface AddressValue {
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
  buildingName: string;
  isBuilding: boolean;
  dong: string;
  ho: string;
  detail: string;
}

export const EMPTY_ADDRESS: AddressValue = {
  roadAddress: "",
  jibunAddress: "",
  zonecode: "",
  buildingName: "",
  isBuilding: false,
  dong: "",
  ho: "",
  detail: "",
};

/** 표시/저장용 전체 주소 문자열 조합 (지번 기준 + 동/호 또는 상세) */
export function composeAddress(v: AddressValue): string {
  const base = v.roadAddress || v.jibunAddress;
  if (!base) return "";
  if (v.isBuilding) {
    const dong = v.dong.trim() ? `${v.dong.trim()}동` : "";
    const ho = v.ho.trim() ? `${v.ho.trim()}호` : "";
    return [base, dong, ho].filter(Boolean).join(" ");
  }
  return [base, v.detail.trim()].filter(Boolean).join(" ");
}

interface AddressSearchFieldProps {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  placeholder?: string;
  /** 비집합건물일 때 상세주소 입력칸 노출 (기본 true) */
  allowDetail?: boolean;
  /** 상세주소 placeholder */
  detailPlaceholder?: string;
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: "8px",
  fontSize: "13px",
  border: "1px solid rgba(0,0,0,0.12)",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
  color: "#1d1d1f",
};

/**
 * 다음(Daum) 주소 검색 + 집합건물 동/호 분리 입력 공통 컴포넌트.
 * 각 폼은 AddressValue 상태만 관리하고, 제출 시 composeAddress(value) 또는 개별 필드를 사용한다.
 */
export function AddressSearchField({
  value,
  onChange,
  placeholder = "주소 검색 (다음 우편번호)",
  allowDetail = true,
  detailPlaceholder = "상세주소 (동·호·층 등)",
}: AddressSearchFieldProps) {
  const [open, setOpen] = useState(false);

  const handlePick = useCallback(
    (r: PostcodeResult) => {
      onChange({
        ...EMPTY_ADDRESS,
        roadAddress: r.roadAddress,
        jibunAddress: r.jibunAddress,
        zonecode: r.zonecode,
        buildingName: r.buildingName,
        isBuilding: r.isBuilding,
      });
      setOpen(false);
    },
    [onChange]
  );

  const selected = value.roadAddress || value.jibunAddress;

  return (
    <div>
      {/* 다음주소 검색 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: "12px 16px",
          borderRadius: "10px",
          fontSize: "14px",
          fontWeight: 500,
          background: "#fff",
          color: selected ? "#1d1d1f" : "#8e8e93",
          border: "1px solid rgba(0,0,0,0.12)",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Search size={16} style={{ color: "var(--brand-primary)", flexShrink: 0 }} />
        {selected || placeholder}
      </button>

      {/* 선택된 주소 표시 */}
      {selected && (
        <div style={{ marginTop: "10px" }}>
          {value.roadAddress && (
            <p style={{ fontSize: "12px", color: "#6e6e73", margin: "0 0 2px" }}>
              <MapPin size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: "4px" }} />
              도로명 {value.roadAddress}
            </p>
          )}
          {value.jibunAddress && (
            <p style={{ fontSize: "12px", color: "#8e8e93", margin: 0, paddingLeft: "17px" }}>
              지번 {value.jibunAddress}
            </p>
          )}
        </div>
      )}

      {/* 집합건물(공동주택) → 동/호 별도 입력 */}
      {selected && value.isBuilding && (
        <div style={{ marginTop: "12px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--brand-primary)", margin: "0 0 6px" }}>
            집합건물(아파트·공동주택) — 동·호수를 입력해 주세요
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              inputMode="numeric"
              value={value.dong}
              onChange={(e) => onChange({ ...value, dong: e.target.value.replace(/[^\d]/g, "") })}
              placeholder="동 (예: 101)"
              style={inputStyle}
            />
            <input
              type="text"
              inputMode="numeric"
              value={value.ho}
              onChange={(e) => onChange({ ...value, ho: e.target.value.replace(/[^\d]/g, "") })}
              placeholder="호 (예: 1502)"
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* 비집합건물 → 상세주소 자유 입력 */}
      {selected && !value.isBuilding && allowDetail && (
        <div style={{ marginTop: "12px" }}>
          <input
            type="text"
            value={value.detail}
            onChange={(e) => onChange({ ...value, detail: e.target.value })}
            placeholder={detailPlaceholder}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
      )}

      {open && <DaumPostcodeModal onComplete={handlePick} onClose={() => setOpen(false)} />}
    </div>
  );
}
