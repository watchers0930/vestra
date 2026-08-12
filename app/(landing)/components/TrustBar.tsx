import { ScrollReveal } from "./ScrollReveal";

export function TrustBar() {
  return (
    <div className="lnd-trust" role="region" aria-label="인증 및 신뢰 정보">
      <div className="lnd-trust-grid">
        <ScrollReveal className="lnd-trust-cell">
          <div className="lnd-t-eyebrow">Patent</div>
          <div className="lnd-t-value">특허 출원 완료</div>
          <div className="lnd-t-desc">
            부동산 거래 위험도 산출장치 및 방법<br />
            출원번호 10-2026-0085160
          </div>
        </ScrollReveal>
        <ScrollReveal className="lnd-trust-cell" delay={0.1}>
          <div className="lnd-t-eyebrow">Certificate of Venture Enterprise</div>
          <div className="lnd-t-value">벤처기업 인증</div>
          <div className="lnd-t-desc">혁신성장유형 · 발급번호 제 20260701030078 호</div>
          <div className="lnd-venture-tag">
            <span className="lnd-v-seal" aria-hidden="true">
              <svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="2,5 4.2,7.5 8,3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            벤처기업확인기관 인증
          </div>
        </ScrollReveal>
        <ScrollReveal className="lnd-trust-cell" delay={0.2}>
          <div className="lnd-t-eyebrow">Data Sources</div>
          <div className="lnd-t-value">공공기관 10종 연동</div>
          <div className="lnd-t-desc">
            국토교통부 · 한국은행 · 금융감독원<br />
            대법원 · DART 등
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
