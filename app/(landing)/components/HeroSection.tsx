import { ScrollReveal } from "./ScrollReveal";

export function HeroSection() {
  return (
    <section className="lnd-hero" aria-label="히어로 섹션">
      <div className="lnd-orb1" aria-hidden="true" />
      <div className="lnd-orb2" aria-hidden="true" />
      <div className="lnd-hero-body">
        <ScrollReveal>
          <div className="lnd-eyebrow-pill">
            <span className="lnd-pill-dot" aria-hidden="true" />
            AI-Powered Real Estate Platform
          </div>
          <h1 className="lnd-hero-h1">
            보이지 않는 위험까지<br /><em>AI가 먼저</em> 감지합니다
          </h1>
          <p className="lnd-hero-p">
            등기부등본 분석부터 전세 안전진단, 등기변동위험감지, 계약서 검토까지<br />
            전문가 수준의 통찰을 누구에게나 제공합니다
          </p>
          <div className="lnd-search-wrap" role="search">
            <input
              type="text"
              placeholder="분석할 주소를 입력하세요 (예: 서울시 강남구 역삼동)"
              aria-label="주소 입력"
            />
            <button className="lnd-search-btn" type="button">분석 시작</button>
          </div>
          <p className="lnd-hero-note">로그인 없이 기본 분석 가능 · 상세 리포트는 회원 전용</p>
        </ScrollReveal>
      </div>
    </section>
  );
}
