"use client";

import { Search, Loader2 } from "lucide-react";

interface Props {
  roadResult: string;
  loading: boolean;
  canSearch: boolean;
  openDaumPostcode: () => void;
  handleAnalyze: () => Promise<void>;
}

export function AddressSearchCard({ roadResult, loading, canSearch, openDaumPostcode, handleAnalyze }: Props) {
  return (
    <div
      role="search"
      aria-label="주소 검색"
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "20px",
        boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
        padding: "24px",
        marginBottom: "20px",
      }}
    >
      <p style={{ fontSize: "12px", color: "#6e6e73", marginBottom: "14px", textAlign: "center" }}>
        주소를 검색하여 선택하세요.
      </p>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <div
          onClick={openDaumPostcode}
          role="button"
          aria-label={roadResult ? `선택된 주소: ${roadResult}. 클릭하여 변경` : "클릭하여 주소 검색"}
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "12px 16px",
            borderRadius: "12px",
            border: roadResult ? "1.5px solid rgba(0,113,227,0.30)" : "1.5px dashed rgba(0,0,0,0.12)",
            background: roadResult ? "rgba(0,113,227,0.03)" : "#fafafa",
            fontSize: "13px",
            color: roadResult ? "#1d1d1f" : "#aeaeb2",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { if (!roadResult) e.currentTarget.style.borderColor = "rgba(0,113,227,0.30)"; }}
          onMouseLeave={(e) => { if (!roadResult) e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; }}
        >
          {roadResult || "클릭하여 주소 검색"}
        </div>
        <button
          onClick={roadResult ? handleAnalyze : openDaumPostcode}
          disabled={roadResult ? (!canSearch || loading) : false}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "12px 22px",
            borderRadius: "12px",
            border: "none",
            background: (roadResult && (!canSearch || loading)) ? "rgba(0,0,0,0.07)" : "#0071e3",
            color: (roadResult && (!canSearch || loading)) ? "#aeaeb2" : "#fff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: (roadResult && (!canSearch || loading)) ? "not-allowed" : "pointer",
            boxShadow: (roadResult && (!canSearch || loading)) ? "none" : "0 4px 16px rgba(0,113,227,0.30)",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? (
            <><Loader2 size={15} className="animate-spin" />분석 중...</>
          ) : (
            <><Search size={15} strokeWidth={2} />{roadResult ? "분석" : "주소 검색"}</>
          )}
        </button>
      </div>
    </div>
  );
}
