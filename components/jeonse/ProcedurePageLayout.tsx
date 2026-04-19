import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export default function ProcedurePageLayout({
  title,
  description,
  icon: Icon,
  breadcrumbLabel,
  children,
  sidebar,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  breadcrumbLabel: string;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}) {
  return (
    <div style={{ paddingBottom: "48px" }}>
      {/* ── 히어로 배너 ── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "28px",
          background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)",
          marginTop: "36px",
          marginBottom: "28px",
        }}
      >
        <div style={{ pointerEvents: "none", position: "absolute", top: "-80px", right: "-20px", height: "320px", width: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.18) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

        <div style={{ position: "relative", zIndex: 1, padding: "36px 44px" }}>
          {/* 브레드크럼 */}
          <nav style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "12px" }}>
            <Link href="/jeonse" style={{ fontSize: "11px", color: "rgba(41,151,255,0.80)", textDecoration: "none", fontWeight: 500 }}>
              전세보호
            </Link>
            <ChevronRight size={11} style={{ color: "rgba(255,255,255,0.25)" }} strokeWidth={2} />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", fontWeight: 500 }}>{breadcrumbLabel}</span>
          </nav>

          {/* 배지 필 */}
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              padding: "4px 11px", borderRadius: "20px",
              fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const,
              color: "#2997ff", background: "rgba(41,151,255,0.10)", border: "1px solid rgba(41,151,255,0.20)",
              marginBottom: "14px",
            }}
          >
            <Icon size={11} strokeWidth={2} />
            {breadcrumbLabel}
          </div>

          <h1 style={{ fontSize: "clamp(22px, 2.4vw, 32px)", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.03em", color: "#fff", margin: 0 }}>
            {title}
          </h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,0.42)", marginTop: "8px", marginBottom: 0 }}>
            {description}
          </p>
        </div>
      </section>

      {sidebar ? (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_360px]">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>{children}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>{sidebar}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>{children}</div>
      )}
    </div>
  );
}
