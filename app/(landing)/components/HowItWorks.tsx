import { ScrollReveal } from "./ScrollReveal";

const STEPS = [
  {
    n: "01", t: "주소 입력",
    d1: "분석할 부동산 주소를 입력합니다.",
    d2: "로그인 없이도 기본 분석을 시작할 수 있습니다.",
  },
  {
    n: "02", t: "AI 자동 분석",
    d1: "등기부등본, 실거래가, 공시지가, 건축물대장을 AI가 수초 내에",
    d2: "종합 분석합니다.",
  },
  {
    n: "03", t: "결과 확인",
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
            <ScrollReveal key={s.n} className="lnd-step" delay={i * 0.1}>
              <div className="lnd-step-n" aria-hidden="true">{s.n}</div>
              <div className="lnd-step-t">{s.t}</div>
              <div className="lnd-step-d">{s.d1}<br />{s.d2}</div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
