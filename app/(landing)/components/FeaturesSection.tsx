import { ScrollReveal } from "./ScrollReveal";

const FEATURES = [
  {
    tier: "tt", label: "Rights Analysis", title: "권리 분석",
    desc: "등기부등본을 AI가 종합 분석하여 권리관계, 위험요소, 안전지수를 한눈에 파악합니다.",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  },
  {
    tier: "tt", label: "Market Prediction", title: "시세 전망",
    desc: "공공데이터와 AI 분석을 결합하여 부동산 시세 추이와 향후 전망을 제공합니다.",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  },
  {
    tier: "tt", label: "Tenant Protection", title: "전세 보호",
    desc: "전세사기 예방을 위한 안전 분석, 전입신고, 확정일자, 전세권설정까지 원스톱 가이드.",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  },
  {
    tier: "", label: "Registry Guard", title: "등기부 AI 보호",
    desc: "AI가 하루 2회 등기부등본 변경사항을 자동 확인합니다. 이상 징후 발견 시 즉시 알립니다.",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>,
  },
  {
    tier: "", label: "Contract Review", title: "계약서 AI 검토",
    desc: "부동산 계약서를 업로드하면 불리한 조항, 누락 사항, 위험 요소를 자동 검출합니다.",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /></svg>,
  },
  {
    tier: "tf", label: "Tax Simulation", title: "세무 시뮬레이션",
    desc: "취득세, 양도소득세, 종합부동산세를 실시간으로 계산하고 절세 전략을 제안합니다.",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
  },
  {
    tier: "", label: "Business Analysis", title: "사업성 분석",
    desc: "다중 문서 기반으로 사업성을 검증하고 SCR 수준의 분석 보고서를 자동 생성합니다.",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
  },
  {
    tier: "", label: "AI Assistant", title: "AI 어시스턴트",
    desc: "부동산 관련 궁금한 점을 AI에게 자유롭게 질문하세요. 법률, 세무, 시장 동향까지.",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>,
  },
];

export function FeaturesSection() {
  return (
    <section className="lnd-features" aria-labelledby="feat-h">
      <div className="lnd-feat-wrap">
        <ScrollReveal className="lnd-sh">
          <div className="lnd-sh-eye"><span className="lnd-sh-line" aria-hidden="true" />Core Services</div>
          <h2 className="lnd-sh-h" id="feat-h">전문가의 시각을<br />AI로 구현했습니다</h2>
          <p className="lnd-sh-p">부동산 거래의 모든 단계를 커버하는 8가지 AI 분석 서비스</p>
        </ScrollReveal>
        <div className="lnd-feat-grid">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} delay={(i % 3) * 0.06}>
              <div className="lnd-feat-card">
                {f.tier && (
                  <span className={`lnd-tier-badge lnd-${f.tier}`}>
                    {f.tier === "tf" ? "FREE" : "무료 체험"}
                  </span>
                )}
                <div className="lnd-feat-ico" aria-hidden="true">{f.icon}</div>
                <div className="lnd-feat-lbl">{f.label}</div>
                <div className="lnd-feat-title">{f.title}</div>
                <div className="lnd-feat-desc">{f.desc}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
