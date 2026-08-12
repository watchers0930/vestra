import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const SITUATIONS = [
  {
    href: "/jeonse/analysis",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    q: "전세 계약을 앞두셨나요?",
    desc: "보증금 안전 여부와 전세사기 위험도를 계약 전에 확인하세요",
    cta: "전세 안전 분석",
  },
  {
    href: "/contract",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    q: "계약서가 있으신가요?",
    desc: "계약서의 독소 조항과 위험 문구를 AI가 즉시 검토합니다",
    cta: "계약서 AI 분석",
  },
  {
    href: "/monitoring",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
    q: "살고 있는 집이 걱정되나요?",
    desc: "등기부등본 변동을 24시간 감시하고 이상 발생 시 즉시 알립니다",
    cta: "등기 모니터링",
  },
];

export function SituationSection() {
  return (
    <section className="lnd-situation" aria-labelledby="sit-h">
      <div className="lnd-sit-wrap">
        <ScrollReveal className="lnd-sh">
          <div className="lnd-sh-eye"><span className="lnd-sh-line" aria-hidden="true" />어떤 상황이신가요</div>
          <h2 className="lnd-sh-h" id="sit-h">지금 상황에 맞는<br />분석을 바로 시작하세요</h2>
        </ScrollReveal>
        <div className="lnd-sit-grid">
          {SITUATIONS.map((s, i) => (
            <ScrollReveal key={s.href} delay={(i + 1) * 0.05}>
              <Link href={s.href} className="lnd-sit-card">
                <div className="lnd-sit-ico" aria-hidden="true">{s.icon}</div>
                <div className="lnd-sit-q">{s.q}</div>
                <div className="lnd-sit-desc">{s.desc}</div>
                <span className="lnd-sit-cta">{s.cta} <ArrowIcon /></span>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
