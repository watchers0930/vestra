"use client";

interface Props {
  loading: boolean;
  total: number;
}

const LEGEND_ITEMS = [
  { color: "#1e3a5f", label: "60평+" },
  { color: "#1e40af", label: "50평대" },
  { color: "#2563eb", label: "40평대" },
  { color: "#3b82f6", label: "30평대" },
  { color: "#93c5fd", label: "20평대 이하" },
];

export function MapOverlay({ loading, total }: Props) {
  return (
    <>
      {/* 로딩 오버레이 */}
      {loading && (
        <div style={{ position: "absolute", top: "12px", left: "50%", transform: "translateX(-50%)", zIndex: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#fff", padding: "12px 20px", borderRadius: "14px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(0,113,227,0.20)", borderTopColor: "#0071e3", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: "13px", color: "#3d3d3f", fontWeight: 500 }}>시세 데이터 로딩 중...</span>
          </div>
        </div>
      )}

      {/* 평형대 범례 */}
      <div style={{ position: "absolute", bottom: "16px", right: "16px", zIndex: 10, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: "14px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.10)", padding: "12px 14px" }}>
        <p style={{ fontSize: "10px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "8px" }}>평형대</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {LEGEND_ITEMS.map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: "11px", color: "#3d3d3f" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 총 건수 배지 */}
      <div style={{ position: "absolute", left: "12px", top: "12px", zIndex: 10, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", padding: "6px 12px" }}>
        <span style={{ fontSize: "12px", color: "#6e6e73" }}>
          <span style={{ fontWeight: 700, color: "#0071e3" }}>{total}</span>개 아파트
        </span>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
