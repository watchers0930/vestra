import s from "./mobile-landing.module.css";

const STEPS = [
  { n: "1", title: "주소 입력", desc: "분석할 부동산 주소를 입력합니다. 로그인 없이도 기본 분석을 시작할 수 있습니다." },
  { n: "2", title: "데이터 분석", desc: "등기부등본, 실거래가, 공시지가, 건축물대장을 AI가 교차 분석합니다." },
  { n: "3", title: "결과 확인", desc: "안전지수, 위험 항목, 권리관계 요약을 한눈에 확인하고 리포트로 받습니다." },
];

export function MobileSteps() {
  return (
    <section className={s.light}>
      <div className={s.head}>
        <span className={s.eyebrow}>이용 방법</span>
        <h2 className={s.secT}>3단계로 끝내는<br />부동산 안전 분석</h2>
      </div>
      <div className={s.timeline}>
        {STEPS.map((st) => (
          <div className={s.tlItem} key={st.n}>
            <div className={s.tlNum}>{st.n}</div>
            <div className={s.tlBody}>
              <h4>{st.title}</h4>
              <p>{st.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
