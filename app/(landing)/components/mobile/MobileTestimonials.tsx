import { TESTIMONIALS } from "../../constants";
import s from "./mobile-landing.module.css";

export function MobileTestimonials() {
  return (
    <section className={s.light}>
      <div className={s.railhead}>
        <span className={s.eyebrow}>고객 후기</span>
        <span className={s.swipe} style={{ color: "var(--blue)" }}>스와이프<svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6h9M8 3l3 3-3 3" /></svg></span>
      </div>
      <div className={s.rail}>
        {TESTIMONIALS.map((t) => (
          <div className={s.tmcard} key={t.name}>
            <div className={s.quote}>&ldquo;</div>
            <p>{t.quote}</p>
            <div className={s.who}>
              <span className={s.av}>{t.name.charAt(0)}</span>
              <span><b>{t.name}</b><small>{t.role}</small></span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
