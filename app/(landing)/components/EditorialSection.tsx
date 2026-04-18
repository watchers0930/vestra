import { ScrollReveal } from "./ScrollReveal";

const EDITORIAL_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC8f0i24S_82YK4xLHt22HAafd7MzmIJoZxGvgQGXp7bGhFuzrOWNIHkWMIRXLDBztpc0omu6_-I3v8TreAmwl9c-PIcXJ1-PnK-DDDsiMsb2coF6Ke02DsnMDofq9V6dUYHYW85orAvOAh7lTRu-ia0RXMY_JGoJprbiZvT1E3EdQSRTBxMTMGbnKruH7o1xz93DkDTeISFHVqgWq0KJanIx-5nKz8kMo0953cwcbcKvemlUi80R3nBCHL8UbmCNJ-lt6CsbCJVA";

export function EditorialSection() {
  return (
    <section className="bg-[#f5f2fa] py-40 px-12">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-28 items-center">

        {/* Left — image */}
        <ScrollReveal className="relative">
          <div className="landing-img-overlay h-[580px] rounded-xl shadow-2xl">
            <img
              src={EDITORIAL_IMAGE}
              alt="Minimalist luxury office interior"
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
            />
          </div>
          {/* Floating result card */}
          <div className="absolute -bottom-10 -right-10 bg-white p-8 max-w-[260px] shadow-2xl rounded-xl z-10">
            <p className="landing-section-label mb-3">The Result</p>
            <p className="text-lg font-extrabold text-[#00042a] leading-snug">
              의사결정 시간 85% 단축, 자산 포트폴리오 안정성 증대.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-[10px] font-bold text-[#454651] tracking-wider">Verified Result</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Right — quote */}
        <ScrollReveal>
          <div className="flex items-center gap-3 mb-8">
            <div className="landing-accent-line" />
            <span className="landing-section-label">Editorial Note</span>
          </div>
          <blockquote className="mb-10">
            <p className="text-[32px] font-thin text-[#00042a] leading-[1.5] italic mb-8">
              &ldquo;VESTRA는 단순한 알고리즘을 넘어선<br />&lsquo;디지털 큐레이터&rsquo;입니다. 데이터 속에<br />숨겨진 이야기를 가장 먼저 감지합니다.&rdquo;
            </p>
            <cite className="not-italic flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#e4e1e9]" />
              <div>
                <span className="block font-extrabold text-[#00042a] uppercase tracking-widest text-[11px]">
                  Dr. Elias Sterling
                </span>
                <span className="block text-[#454651] text-sm mt-0.5">
                  Real Estate Investment Strategist
                </span>
              </div>
            </cite>
          </blockquote>
          <p className="text-[#454651] leading-[1.9] text-[16px] mb-10">
            전통적인 부동산 시장은 정보의 비대칭성이 가장 큰 장벽이었습니다. VESTRA는 이 장벽을 허물고, 모든 투자자에게 전문적인 통찰력을 제공하기 위해 탄생했습니다.
          </p>
          <button className="flex items-center gap-2 text-[11px] font-bold text-[#00042a] tracking-widest uppercase group">
            <span className="border-b border-[#00042a]/30 pb-0.5 group-hover:border-[#00042a] transition-colors">
              더 알아보기
            </span>
            <span
              className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
            >
              arrow_forward
            </span>
          </button>
        </ScrollReveal>

      </div>
    </section>
  );
}
