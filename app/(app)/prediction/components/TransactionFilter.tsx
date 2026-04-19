"use client";

interface Props {
  availableApts: string[];
  availableAreas: number[];
  selectedApt: string | null;
  setSelectedApt: (apt: string | null) => void;
  selectedArea: number | null;
  setSelectedArea: (area: number | null) => void;
}

export function TransactionFilter({
  availableApts, availableAreas,
  selectedApt, setSelectedApt,
  selectedArea, setSelectedArea,
}: Props) {
  if (availableApts.length === 0 && availableAreas.length === 0) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {availableApts.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#6e6e73", whiteSpace: "nowrap" }}>아파트</span>
          <select
            value={selectedApt ?? ""}
            onChange={(e) => { setSelectedApt(e.target.value || null); setSelectedArea(null); }}
            style={{
              flex: 1,
              maxWidth: "320px",
              padding: "7px 12px",
              fontSize: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(0,0,0,0.10)",
              background: "#fff",
              color: "#1d1d1f",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">전체 ({availableApts.length}개 단지)</option>
            {availableApts.map((apt) => <option key={apt} value={apt}>{apt}</option>)}
          </select>
        </div>
      )}

      {availableAreas.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#6e6e73", whiteSpace: "nowrap" }}>전용면적</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <button
              onClick={() => setSelectedArea(null)}
              style={{
                padding: "5px 14px",
                fontSize: "12px",
                borderRadius: "20px",
                border: selectedArea === null ? "none" : "1px solid rgba(0,0,0,0.10)",
                background: selectedArea === null ? "#0071e3" : "#fff",
                color: selectedArea === null ? "#fff" : "#6e6e73",
                cursor: "pointer",
                fontWeight: selectedArea === null ? 600 : 400,
                boxShadow: selectedArea === null ? "0 2px 8px rgba(0,113,227,0.25)" : "none",
                transition: "all 0.12s",
              }}
            >
              전체평수
            </button>
            {availableAreas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                style={{
                  padding: "5px 14px",
                  fontSize: "12px",
                  borderRadius: "20px",
                  border: selectedArea === area ? "none" : "1px solid rgba(0,0,0,0.10)",
                  background: selectedArea === area ? "#0071e3" : "#fff",
                  color: selectedArea === area ? "#fff" : "#6e6e73",
                  cursor: "pointer",
                  fontWeight: selectedArea === area ? 600 : 400,
                  boxShadow: selectedArea === area ? "0 2px 8px rgba(0,113,227,0.25)" : "none",
                  transition: "all 0.12s",
                }}
              >
                {area}㎡
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
