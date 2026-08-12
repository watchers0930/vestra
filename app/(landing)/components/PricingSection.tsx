import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

const PLANS = [
  {
    name: "Lite", price: "₩29,000", unit: "/mo",
    desc: "개인 투자자를 위한 시작 플랜", hot: false, cta: "시작하기",
    features: ["월 5회 정밀 권리 분석", "실시간 시세 모니터링", "기본 시장 트렌드 리포트"],
  },
  {
    name: "Professional", price: "₩89,000", unit: "/mo",
    desc: "활발한 투자자를 위한 전문 플랜", hot: true, cta: "지금 시작하기",
    features: ["월 무제한 권리 분석", "24개월 가치 예측 AI 모델", "심층 법률 리스크 검토", "우선 고객 지원"],
  },
  {
    name: "Enterprise", price: "별도 문의", unit: "",
    desc: "기업 및 기관 투자자를 위한 플랜", hot: false, cta: "상담 신청하기",
    features: ["맞춤형 API 통합", "전담 분석 매니저 배정", "법인용 화이트 라벨링"],
  },
];

export function PricingSection() {
  return (
    <section className="lnd-pricing" aria-labelledby="price-h">
      <div className="lnd-price-wrap">
        <ScrollReveal className="lnd-sh" style={{ textAlign: "center" }}>
          <div className="lnd-sh-eye" style={{ justifyContent: "center" }}>
            <span className="lnd-sh-line" aria-hidden="true" />Pricing<span className="lnd-sh-line" aria-hidden="true" />
          </div>
          <h2 className="lnd-sh-h" id="price-h">자산 규모에 맞는<br />플랜을 선택하세요</h2>
        </ScrollReveal>
        <div className="lnd-price-grid">
          {PLANS.map((p, i) => (
            <ScrollReveal key={p.name} delay={i * 0.1}>
              <div className={`lnd-p-card${p.hot ? " lnd-hot" : ""}`}>
                {p.hot && <div className="lnd-hot-badge">Most Popular</div>}
                <div className="lnd-p-name">{p.name}</div>
                <div className="lnd-p-price">
                  {p.price}
                  <span style={p.hot ? { color: "rgba(255,255,255,.45)" } : {}}>{p.unit}</span>
                </div>
                <div className="lnd-p-desc">{p.desc}</div>
                <ul className="lnd-p-list">
                  {p.features.map((f) => (
                    <li key={f} className="lnd-p-li">
                      <span className="lnd-p-check">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="lnd-p-btn">{p.cta}</Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
