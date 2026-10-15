import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import { PRICING_PLANS } from "@/lib/pricing-plans";

// 요금제는 공유 상수(lib/pricing-plans) 단일 소스에서 파생한다.
const CTA_LABEL: Record<string, string> = { free: "시작하기", pro: "지금 시작하기", business: "문의하기" };
const PLANS = PRICING_PLANS.map((p) => ({
  name: p.name,
  price: p.monthlyLabel,
  unit: p.period,
  desc: p.description,
  hot: p.highlight,
  cta: CTA_LABEL[p.key],
  features: p.features,
}));

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
                <Link href="/home?auth=login" className="lnd-p-btn">{p.cta}</Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
