import Link from "next/link";

const SITUATIONS = [
  {
    icon: "🏠",
    question: "전세 계약 앞두셨나요?",
    description: "보증금 안전 여부와 전세사기 위험도를 계약 전에 확인하세요",
    cta: "전세 안전 분석 →",
    href: "/jeonse/analysis",
    accent: "#7b8fff",
  },
  {
    icon: "📄",
    question: "계약서가 있으신가요?",
    description: "계약서의 독소조항과 위험 문구를 AI가 즉시 검토합니다",
    cta: "계약서 AI 분석 →",
    href: "/contract",
    accent: "#4cd98a",
  },
  {
    icon: "🔔",
    question: "살고 있는 집이 걱정되나요?",
    description: "등기부등본 변동을 24시간 감시하고 이상 발생 시 즉시 알립니다",
    cta: "등기 모니터링 →",
    href: "/monitoring",
    accent: "#fbbf24",
  },
];

export function SituationSection() {
  return (
    <div style={{ backgroundColor: "#00042a", padding: "56px 0" }}>
      <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "0 48px" }}>
        <h2 style={{ color: "#ffffff", fontSize: "22px", fontWeight: 800, marginBottom: "28px", letterSpacing: "-0.02em" }}>
          지금 어떤 상황이신가요?
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {SITUATIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                padding: "24px",
                borderRadius: "12px",
                backgroundColor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                textDecoration: "none",
                transition: "background 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px", lineHeight: 1 }}>{s.icon}</span>
                <p style={{ color: "#ffffff", fontSize: "15px", fontWeight: 700, margin: 0 }}>{s.question}</p>
              </div>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px", lineHeight: 1.65, margin: 0 }}>
                {s.description}
              </p>
              <span style={{ color: s.accent, fontSize: "13px", fontWeight: 700 }}>
                {s.cta}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
