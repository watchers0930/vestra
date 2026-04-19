import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export default function ProcedurePageLayout({
  title,
  description,
  icon: Icon,
  breadcrumbLabel,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  breadcrumbLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", paddingBottom: "48px" }}>
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
        <div style={{ pointerEvents: "none", position: "absolute", top: "-80px", right: "-20px", height: "280px", width: "280px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.18) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

        <div style={{ position: "relative", zIndex: 1, padding: "32px 40px" }}>
          {/* 브레드크럼 */}
          <nav style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "16px" }}>
            <Link href="/jeonse" style={{ fontSize: "11px", color: "rgba(41,151,255,0.80)", textDecoration: "none", fontWeight: 500 }}>
              전세보호
            </Link>
            <ChevronRight size={11} style={{ color: "rgba(255,255,255,0.25)" }} strokeWidth={2} />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", fontWeight: 500 }}>{breadcrumbLabel}</span>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "52px", height: "52px", borderRadius: "16px",
                background: "rgba(0,113,227,0.15)", border: "1px solid rgba(0,113,227,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <Icon size={24} style={{ color: "#2997ff" }} strokeWidth={1.5} />
            </div>
            <div>
              <h1 style={{ fontSize: "clamp(20px, 2.2vw, 28px)", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.03em", color: "#fff", margin: 0 }}>
                {title}
              </h1>
              <p style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.42)", marginTop: "6px", marginBottom: 0 }}>
                {description}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {children}
      </div>
    </div>
  );
}
