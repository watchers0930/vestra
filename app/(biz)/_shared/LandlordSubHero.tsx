"use client";

import { usePathname } from "next/navigation";
import { getLandlordPageMeta } from "./landlord-config";

/**
 * 임대사업자 서브 페이지 공통 히어로 — 가로 100%, 높이 200px, 카테고리 라벨.
 * 중개사 서브히어로(RealtorSubHero)와 동일 톤이며, 경로 메타는 landlord-config를 참조한다.
 * 경로에 매핑된 카테고리가 없으면(홈 등) 렌더하지 않는다.
 */
export default function LandlordSubHero() {
  const pathname = usePathname();
  const meta = getLandlordPageMeta(pathname);
  if (!meta) return null;

  return (
    <section
      style={{
        width: "100%",
        height: 200,
        background: "linear-gradient(120deg, #060c2a 0%, #162058 58%, #2e4bd8 135%)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "0 32px" }}>
        <p style={{ fontSize: 12, letterSpacing: "1.6px", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", marginBottom: 12 }}>
          Landlord Workspace
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>
          {meta.label}
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)" }}>{meta.desc}</p>
      </div>
    </section>
  );
}
