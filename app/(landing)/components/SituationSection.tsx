import Link from "next/link";

const SITUATIONS = [
  {
    icon: "🏠",
    question: "전세 계약 앞두셨나요?",
    description: "보증금 안전 여부와 전세사기 위험도를 계약 전에 확인하세요",
    cta: "전세 안전 분석 →",
    href: "/jeonse/analysis",
    accent: "#4a58a7",
  },
  {
    icon: "📄",
    question: "계약서가 있으신가요?",
    description: "계약서의 독소조항과 위험 문구를 AI가 즉시 검토합니다",
    cta: "계약서 AI 분석 →",
    href: "/contract",
    accent: "#1a9e45",
  },
  {
    icon: "🔔",
    question: "살고 있는 집이 걱정되나요?",
    description: "등기부등본 변동을 24시간 감시하고 이상 발생 시 즉시 알립니다",
    cta: "등기 모니터링 →",
    href: "/monitoring",
    accent: "#d97706",
  },
];

export function SituationSection() {
  return (
    <div className="max-w-[1440px] mx-auto w-full px-5 lg:px-12 pb-16 pt-10">
      <h2 className="text-[18px] lg:text-[22px] font-extrabold text-[#00042a] tracking-tight mb-6">
        지금 어떤 상황이신가요?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {SITUATIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col gap-3 rounded-xl p-6 bg-white/60 hover:bg-white transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{s.icon}</span>
              <p className="text-[15px] font-extrabold text-[#00042a]">{s.question}</p>
            </div>
            <p className="text-[13px] text-[#6d6d78] leading-[1.65]">{s.description}</p>
            <span
              className="text-[13px] font-bold"
              style={{ color: s.accent }}
            >
              {s.cta}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
