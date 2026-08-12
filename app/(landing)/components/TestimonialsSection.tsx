import { ScrollReveal } from "./ScrollReveal";

const TESTIMONIALS = [
  {
    quote: "전세 계약 전 VESTRA로 분석했더니 숨겨진 근저당을 발견했어요. 덕분에 큰 피해를 막을 수 있었습니다.",
    name: "김민준", role: "개인 투자자", av: "김", avBg: "#2563eb",
  },
  {
    quote: "권리분석 결과를 PDF로 받아 투자 검토에 활용했습니다. 전문가 수준의 분석이 놀랍도록 정확합니다.",
    name: "이지은", role: "부동산 컨설턴트", av: "이", avBg: "rgba(8,12,26,.65)",
  },
  {
    quote: "AI가 계약서 독소 조항을 잡아주니 변호사 비용이 절감되었어요. 리스크 관리가 한결 편해졌습니다.",
    name: "박재현", role: "자산운용사 대표", av: "박", avBg: "rgba(37,99,235,.55)",
  },
];

export function TestimonialsSection() {
  return (
    <section className="lnd-testi" aria-labelledby="testi-h">
      <div className="lnd-testi-wrap">
        <ScrollReveal className="lnd-sh">
          <div className="lnd-sh-eye"><span className="lnd-sh-line" aria-hidden="true" />고객 후기</div>
          <h2 className="lnd-sh-h" id="testi-h">실제 사용자의 이야기</h2>
        </ScrollReveal>
        <div className="lnd-testi-grid">
          {TESTIMONIALS.map((t, i) => (
            <ScrollReveal key={t.name} delay={(i + 1) * 0.1}>
              <div className="lnd-t-card">
                <div className="lnd-t-stars" aria-label="별점 5점">
                  {Array(5).fill(0).map((_, j) => <div key={j} className="lnd-t-star" />)}
                </div>
                <p className="lnd-t-q">&ldquo;{t.quote}&rdquo;</p>
                <div className="lnd-t-auth">
                  <div className="lnd-t-av" style={{ background: t.avBg }}>{t.av}</div>
                  <div>
                    <div className="lnd-t-nm">{t.name}</div>
                    <div className="lnd-t-role">{t.role}</div>
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
