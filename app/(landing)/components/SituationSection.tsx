import Link from "next/link";

const SITUATIONS = [
  {
    emoji: "🏠",
    question: "전세 계약 앞두셨나요?",
    description: "보증금 안전 여부, 전세사기 위험도를 계약 전에 확인하세요",
    cta: "전세 안전 분석 →",
    href: "/jeonse/analysis",
    accent: "#4a58a7",
    bg: "rgba(74,88,167,0.06)",
  },
  {
    emoji: "📄",
    question: "계약서가 있으신가요?",
    description: "계약서의 독소조항, 누락 조항, 위험 문구를 AI가 검토합니다",
    cta: "계약서 AI 분석 →",
    href: "/contract",
    accent: "#1a9e45",
    bg: "rgba(26,158,69,0.06)",
  },
  {
    emoji: "🔔",
    question: "이미 살고 있는 집이 걱정되나요?",
    description: "등기부등본 변동을 24시간 감시하고 이상 발생 시 즉시 알립니다",
    cta: "등기 모니터링 →",
    href: "/monitoring",
    accent: "#d97706",
    bg: "rgba(217,119,6,0.06)",
  },
];

export function SituationSection() {
  return (
    <section className="bg-[#fbf8ff] px-5 lg:px-12 pb-16 pt-6">
      <div className="max-w-[1440px] mx-auto w-full">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9e9cb0] mb-5">
          나에게 맞는 시작점 선택
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SITUATIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex flex-col gap-3 rounded-2xl border border-[#e8e5f0] p-6 transition-all hover:shadow-md hover:border-[#c8c4d8]"
              style={{ background: s.bg }}
            >
              <span className="text-2xl">{s.emoji}</span>
              <p className="text-[15px] font-bold text-[#00042a] leading-[1.3]">{s.question}</p>
              <p className="text-[13px] text-[#6d6d78] leading-[1.6] flex-1">{s.description}</p>
              <span
                className="text-[13px] font-semibold mt-1"
                style={{ color: s.accent }}
              >
                {s.cta}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
