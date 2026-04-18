import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

const FEATURES_DATA = [
  {
    icon: "gavel",
    label: "Rights Analysis",
    title: "권리 분석",
    desc: "복잡한 등기부등본과 토지대장을 AI가 초단위로 스캔하여 잠재적인 법적 리스크를 사전에 식별합니다.",
  },
  {
    icon: "query_stats",
    label: "Market Prediction",
    title: "시장 예측",
    desc: "과거 실거래 데이터와 주변 상권 분석을 결합하여 향후 24개월간의 자산 가치 변동을 예측합니다.",
  },
  {
    icon: "shield",
    label: "Tenant Protection",
    title: "임대차 보호",
    desc: "최신 법 개정 사항과 임대 시장 동향을 반영하여 계약 시 발생할 수 있는 독소 조항을 걸러냅니다.",
  },
];

const iconStyle = { fontVariationSettings: "'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24" };

export function FeaturesSection() {
  return (
    <section id="features" className="py-40 px-12 bg-[#fbf8ff]">
      <div className="max-w-[1440px] mx-auto">

        {/* Header */}
        <ScrollReveal className="flex items-end justify-between mb-24">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="landing-accent-line" />
              <span className="landing-section-label">Core Services</span>
            </div>
            <h2 className="text-5xl font-extrabold text-[#00042a] leading-tight tracking-tight">
              전문가의 시각을<br />AI로 구현했습니다
            </h2>
          </div>
          <Link
            href="/login"
            className="hidden lg:flex items-center gap-2 text-[11px] font-bold text-[#454651] tracking-widest uppercase hover:text-[#00042a] transition-colors group"
          >
            전체 서비스 보기
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform" style={iconStyle}>
              arrow_forward
            </span>
          </Link>
        </ScrollReveal>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES_DATA.map((f, i) => (
            <ScrollReveal key={f.title} delay={(i + 1) * 0.1}>
              <div className="landing-feature-card rounded-xl p-10 bg-white cursor-default h-full">

                {/* Icon */}
                <div className="w-14 h-14 flex items-center justify-center bg-[#f5f2fa] rounded-xl mb-8">
                  <span className="material-symbols-outlined text-2xl text-[#00042a]" style={iconStyle}>
                    {f.icon}
                  </span>
                </div>

                {/* Label */}
                <span className="landing-section-label block mb-3">{f.label}</span>

                {/* Title */}
                <h3 className="text-xl font-extrabold text-[#00042a] mb-4 tracking-tight">{f.title}</h3>

                {/* Description */}
                <p className="text-[#454651] font-normal leading-[1.8] text-[15px]">{f.desc}</p>

                {/* Link */}
                <div className="mt-8 flex items-center gap-2 text-[#00042a] font-bold text-[11px] tracking-widest uppercase group cursor-pointer">
                  자세히 보기
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform" style={iconStyle}>
                    arrow_forward
                  </span>
                </div>

              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  );
}
