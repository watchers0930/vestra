import { ScrollReveal } from "./ScrollReveal";

const TESTIMONIALS_DATA = [
  {
    quote: "전세 계약 전 VESTRA로 분석했더니 숨겨진 근저당을 발견했어요. 덕분에 큰 피해를 막을 수 있었습니다.",
    name: "김민준",
    role: "개인 투자자",
  },
  {
    quote: "권리분석 결과를 PDF로 받아 투자 검토에 활용했습니다. 전문가 수준의 분석이 놀랍도록 정확합니다.",
    name: "이지은",
    role: "부동산 컨설턴트",
  },
  {
    quote: "AI가 계약서 독소 조항을 잡아주니 변호사 비용이 절감되었어요. 리스크 관리가 한결 편해졌습니다.",
    name: "박재현",
    role: "자산운용사 대표",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-32 px-12 bg-[#f5f2fa]">
      <div className="max-w-[1440px] mx-auto">
        <ScrollReveal className="flex items-center gap-3 mb-16">
          <div className="landing-accent-line" />
          <span className="landing-section-label">고객 후기</span>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS_DATA.map((t, i) => (
            <ScrollReveal key={t.name} delay={(i + 1) * 0.1}>
              <div className="landing-testimonial-card rounded-xl p-8">
                <div className="flex gap-0.5 mb-5">
                  {Array(5).fill(0).map((_, j) => (
                    <span
                      key={j}
                      className="material-symbols-outlined text-xs text-amber-400"
                      style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <p className="text-[#1b1b20] leading-[1.8] text-[15px] mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#e4e1e9]" />
                  <div>
                    <p className="text-[12px] font-bold text-[#00042a]">{t.name}</p>
                    <p className="text-[10px] text-[#454651]">{t.role}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
