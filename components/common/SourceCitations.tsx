import type { SourceCitation } from "@/lib/analysis-sources";

/**
 * 분석 근거(citation) 표시 — AI 근거표시 (P0-1)
 * 분석 판단이 근거한 실제 데이터(실거래·등기·건축물·시세·위험도·V-Score)의 출처를 보여준다.
 * 값은 서버가 실제 fetch·계산한 것만 담기므로(환각 0) "검증 가능한 근거"로 신뢰를 준다.
 */

const CATEGORY_STYLE: Record<string, { bg: string; fg: string }> = {
  실거래: { bg: "rgba(37,99,235,0.08)", fg: "#2563eb" },
  등기: { bg: "rgba(26,127,75,0.08)", fg: "#1a7f4b" },
  건축물대장: { bg: "rgba(180,83,9,0.08)", fg: "#b45309" },
  시세추정: { bg: "rgba(37,99,235,0.08)", fg: "#2563eb" },
  위험도: { bg: "rgba(192,57,43,0.08)", fg: "#c0392b" },
  "V-Score": { bg: "rgba(107,70,193,0.08)", fg: "#6b46c1" },
};

export function SourceCitations({ sources }: { sources?: SourceCitation[] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div style={{ marginTop: 16, border: "1px solid #e5e5ea", borderRadius: 14, padding: 16, background: "#fafafa" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#1d1d1f" }}>분석 근거</span>
        <span style={{ fontSize: 11, color: "#aeaeb2" }}>· 이 분석이 근거한 실제 데이터</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sources.map((s, i) => {
          const style = CATEGORY_STYLE[s.category] ?? { bg: "#f2f2f7", fg: "#6e6e73" };
          return (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{
                flexShrink: 0, fontSize: 11, fontWeight: 700, color: style.fg, background: style.bg,
                borderRadius: 7, padding: "3px 8px", minWidth: 62, textAlign: "center",
              }}>{s.category}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>{s.label}</p>
                <p style={{ fontSize: 12, color: "#3d3d3f", margin: "1px 0 0", lineHeight: 1.45 }}>{s.detail}</p>
                <p style={{ fontSize: 10.5, color: "#aeaeb2", margin: "2px 0 0" }}>
                  출처: {s.provider}{s.asOf ? ` · ${s.asOf}` : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
