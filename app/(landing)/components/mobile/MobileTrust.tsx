import s from "./mobile-landing.module.css";

const BADGES = [
  { title: "특허 출원 완료", sub: "권리분석 그래프 엔진",
    icon: <path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" /> },
  { title: "벤처기업 인증", sub: "혁신성장유형 · 발급번호 제20260701030078호",
    icon: <path d="M12 2l2.4 6.9H22l-6 4.4 2.3 7-6.3-4.4L5.7 20l2.3-7-6-4.4h7.6z" /> },
  { title: "공공기관 10종 연동", sub: "국토부 · 대법원 · 행안부 실시간 데이터",
    icon: <><rect x="3" y="10" width="18" height="11" rx="1" /><path d="M6 10V7a6 6 0 0112 0v3" /></> },
];

export function MobileTrust() {
  return (
    <section className={s.trust}>
      <p className={s.tlabel}>인증 및 신뢰 정보</p>
      <div className={s.trustlist}>
        {BADGES.map((b) => (
          <div className={s.tbadge} key={b.title}>
            <span className={s.ic}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{b.icon}</svg>
            </span>
            <span><b>{b.title}</b><small>{b.sub}</small></span>
          </div>
        ))}
      </div>
    </section>
  );
}
