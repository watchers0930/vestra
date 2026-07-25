import Link from "next/link";

export function HeroSearchInput() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px" }}>
      <Link
        href="/jeonse/analysis"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "14px 28px",
          borderRadius: "8px",
          backgroundColor: "#00042a",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: "15px",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        전세 위험도 분석
      </Link>
      <Link
        href="/rights"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "14px 28px",
          borderRadius: "8px",
          border: "2px solid #00042a",
          backgroundColor: "transparent",
          color: "#00042a",
          fontWeight: 700,
          fontSize: "15px",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        등기부 권리분석
      </Link>
    </div>
  );
}
