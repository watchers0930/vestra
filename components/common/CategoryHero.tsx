"use client";

import type { ReactNode } from "react";
import { useSession } from "next-auth/react";

type CategoryHeroProps = {
  badge: ReactNode;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  marginBottom?: string;
};

export function CategoryHero({
  badge,
  title,
  description,
  actions,
  marginBottom = "28px",
}: CategoryHeroProps) {
  const { data } = useSession();
  const isRealtor = data?.user?.role === "REALESTATE";

  // 부동산 계정: 서브 히어로가 카테고리 타이틀 역할 → 중복 헤더(badge/title/desc) 제거.
  // 액션 버튼만 있으면 얇은 바로 남기고, 없으면 렌더하지 않아 콘텐츠가 곧바로 시작한다.
  if (isRealtor) {
    if (!actions) return null;
    return (
      <section style={{ margin: "0 0 16px", display: "flex", justifyContent: "flex-end" }}>
        {actions}
      </section>
    );
  }

  return (
    <section
      className="cat-hero"
      style={{
        marginTop: "40px",
        marginBottom,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "20px",
          flexWrap: "wrap",
          padding: "12px 6px 8px",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 420px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 11px",
              borderRadius: "20px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#0b63ce",
              background: "rgba(41,151,255,0.10)",
              border: "1px solid rgba(41,151,255,0.18)",
              marginBottom: "14px",
            }}
          >
            {badge}
          </div>
          <h1
            style={{
              fontSize: "clamp(22px, 2.4vw, 32px)",
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.03em",
              color: "#13233f",
              margin: 0,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#58677f",
              marginTop: "8px",
              marginBottom: 0,
            }}
          >
            {description}
          </p>
        </div>

        {actions ? <div style={{ flexShrink: 0 }}>{actions}</div> : null}
      </div>
    </section>
  );
}
