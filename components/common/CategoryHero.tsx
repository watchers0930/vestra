import type { ReactNode } from "react";

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
  return (
    <section
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
