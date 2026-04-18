import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import { PLANS } from "../constants";

export function PricingSection() {
  return (
    <section id="pricing" className="py-40 px-12 bg-[#fbf8ff]">
      <div className="max-w-[1440px] mx-auto">
        <ScrollReveal className="text-center mb-24">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="landing-accent-line" />
            <span className="landing-section-label">Pricing</span>
            <div className="landing-accent-line" />
          </div>
          <h2 className="text-5xl font-extrabold text-[#00042a] mb-5 tracking-tight">비즈니스에 최적화된 플랜</h2>
          <p className="text-[#454651] text-lg">자산 규모와 목적에 맞는 최적의 분석 도구를 선택하세요.</p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 0.1}>
              <div className={`landing-pricing-card rounded-xl p-10 flex flex-col relative ${
                plan.highlight
                  ? "bg-[#00042a] landing-pricing-featured"
                  : "bg-[#f5f2fa]"
              }`}>
                {plan.highlight && (
                  <>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-[#00042a] px-5 py-1.5 text-[9px] font-extrabold tracking-widest uppercase rounded-full shadow-lg z-10">
                      Most Popular
                    </div>
                  </>
                )}
                <div className="mb-10 relative z-10">
                  <p className={`landing-section-label mb-5 ${plan.highlight ? "text-white/50" : ""}`}>{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className={`text-4xl font-extrabold ${plan.highlight ? "text-white" : "text-[#00042a]"}`}>
                      {plan.price !== "별도 문의" ? `₩${plan.price}` : plan.price}
                    </span>
                    {plan.price !== "별도 문의" && (
                      <span className={`text-sm ${plan.highlight ? "text-white/50" : "text-[#454651]"}`}>/mo</span>
                    )}
                  </div>
                  <p className={`text-xs ${plan.highlight ? "text-white/60" : "text-[#454651]"}`}>{plan.description}</p>
                </div>
                <ul className="space-y-4 mb-12 flex-grow relative z-10">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-3 text-sm ${plan.highlight ? "text-white/80" : "text-[#454651]"}`}>
                      <span
                        className={`material-symbols-outlined text-sm mt-0.5 ${plan.highlight ? "text-white" : "text-[#00042a]"}`}
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
                      >
                        check
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`relative z-10 block w-full py-4 rounded text-center text-[11px] font-extrabold tracking-widest uppercase transition-colors ${
                    plan.highlight
                      ? "bg-white text-[#00042a] hover:bg-blue-50"
                      : "landing-ghost-btn"
                  }`}
                >
                  {plan.highlight ? "지금 시작하기" : plan.name === "Enterprise" ? "상담 신청하기" : "시작하기"}
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
