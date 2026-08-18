import Link from "next/link";
import { PLANS } from "../../constants";
import s from "./mobile-landing.module.css";

const Check = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M20 6L9 17l-5-5" /></svg>
);

export function MobilePricing() {
  return (
    <section className={s.price}>
      <div className={s.head}>
        <span className={s.eyebrow}>요금제</span>
        <h2 className={s.secT} style={{ color: "var(--w)" }}>필요한 만큼<br />선택하세요</h2>
      </div>
      <div className={s.priceStack}>
        {PLANS.map((p) => {
          const isMoney = /\d/.test(p.price);
          return (
            <div className={`${s.pcard} ${p.highlight ? s.pcardHot : ""}`} key={p.name}>
              <div className={s.phead}>
                <h4>{p.name}</h4>
                {p.highlight && <span className={s.ptag}>인기</span>}
              </div>
              {isMoney
                ? <div className={s.amt}>{p.price}<small> 원/월</small></div>
                : <div className={s.amt} style={{ fontSize: 22 }}>{p.price}</div>}
              <p className={s.pdesc}>{p.description}</p>
              <ul className={s.pfeats}>
                {p.features.map((f) => <li key={f}><Check />{f}</li>)}
              </ul>
              <Link className={s.buy} href="/login">{p.highlight ? "지금 시작하기" : "선택하기"}</Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
