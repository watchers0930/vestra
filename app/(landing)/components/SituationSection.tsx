import Link from "next/link";

const SITUATIONS = [
  {
    icon: "🏠",
    iconBg: "rgba(74,88,167,0.10)",
    question: "전세 계약\n앞두셨나요?",
    description: "보증금 안전 여부와 전세사기 위험도를 계약 전에 확인하세요",
    cta: "전세 안전 분석 →",
    href: "/jeonse/analysis",
    accent: "#4a58a7",
    border: "rgba(74,88,167,0.18)",
    hoverBorder: "#4a58a7",
  },
  {
    icon: "📄",
    iconBg: "rgba(26,158,69,0.10)",
    question: "계약서가\n있으신가요?",
    description: "계약서의 독소조항과 위험 문구를 AI가 즉시 검토합니다",
    cta: "계약서 AI 분석 →",
    href: "/contract",
    accent: "#1a9e45",
    border: "rgba(26,158,69,0.18)",
    hoverBorder: "#1a9e45",
  },
  {
    icon: "🔔",
    iconBg: "rgba(217,119,6,0.10)",
    question: "살고 있는 집이\n걱정되나요?",
    description: "등기부등본 변동을 24시간 감시하고 이상 발생 시 즉시 알립니다",
    cta: "등기 모니터링 →",
    href: "/monitoring",
    accent: "#d97706",
    border: "rgba(217,119,6,0.18)",
    hoverBorder: "#d97706",
  },
];

export function SituationSection() {
  return (
    <section className="bg-white px-5 lg:px-12 py-14 border-t border-[#f0edf8]">
      <div className="max-w-[1440px] mx-auto w-full">
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9e9cb0] mb-2">
            상황별 빠른 진입
          </p>
          <h2 className="text-[20px] lg:text-[26px] font-extrabold text-[#00042a] tracking-tight">
            지금 어떤 상황이신가요?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SITUATIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group relative flex flex-col gap-4 rounded-2xl p-6 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              style={{ border: `1.5px solid ${s.border}` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: s.iconBg }}
              >
                {s.icon}
              </div>

              <div className="flex-1">
                <p className="text-[17px] font-extrabold text-[#00042a] leading-[1.35] mb-2 whitespace-pre-line">
                  {s.question}
                </p>
                <p className="text-[13px] text-[#6d6d78] leading-[1.65]">
                  {s.description}
                </p>
              </div>

              <span
                className="text-[13px] font-bold flex items-center gap-1 group-hover:gap-2 transition-all"
                style={{ color: s.accent }}
              >
                {s.cta}
              </span>

              {/* hover accent bar */}
              <div
                className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: s.accent }}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
