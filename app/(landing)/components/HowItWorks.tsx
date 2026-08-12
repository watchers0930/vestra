import { ScrollReveal } from "./ScrollReveal";

const STEPS = [
  {
    img: "https://images.unsplash.com/photo-1498230870289-7561110a6e69?w=400&h=1600&fit=crop&q=80",
    alt: "스마트폰으로 부동산 주소 검색",
    t: "주소 입력",
    d1: "분석할 부동산 주소를 입력합니다.",
    d2: "로그인 없이도 기본 분석을 시작할 수 있습니다.",
  },
  {
    img: "https://images.unsplash.com/photo-1694903089438-41b3d5ad2a27?w=400&h=1600&fit=crop&q=80",
    alt: "AI 데이터 자동 분석 화면",
    t: "AI 자동 분석",
    d1: "등기부등본, 실거래가, 공시지가, 건축물대장을 AI가 수초 내에",
    d2: "종합 분석합니다.",
  },
  {
    img: "https://images.unsplash.com/photo-1632433105322-7c42916e24a8?w=400&h=1600&fit=crop&q=80",
    alt: "분석 결과 리포트 확인",
    t: "결과 확인",
    d1: "안전지수, 위험 항목, 권리관계 요약을 한눈에 확인하고 PDF로",
    d2: "저장합니다.",
  },
];

export function HowItWorks() {
  return (
    <section className="lnd-howto" aria-labelledby="howto-h">
      <div className="lnd-howto-wrap">
        <ScrollReveal className="lnd-sh">
          <div className="lnd-sh-eye"><span className="lnd-sh-line" aria-hidden="true" />How it Works</div>
          <h2 className="lnd-sh-h" id="howto-h">3단계로 끝나는<br />부동산 안전 분석</h2>
        </ScrollReveal>
        <div className="lnd-steps">
          {STEPS.map((s, i) => (
            <ScrollReveal key={s.t} className="lnd-step" delay={i * 0.1}>
              <div className="lnd-step-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.img} alt={s.alt} loading="lazy" />
              </div>
              <div className="lnd-step-t">{s.t}</div>
              <div className="lnd-step-d">{s.d1}<br />{s.d2}</div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
