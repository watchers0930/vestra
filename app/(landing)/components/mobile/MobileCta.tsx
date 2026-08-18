import Link from "next/link";
import s from "./mobile-landing.module.css";

export function MobileCta() {
  return (
    <section className={s.cta}>
      <h3>지금 바로<br />시작하세요</h3>
      <p>로그인 없이 시세지도, 공시가격, 세금계산을<br />바로 이용하세요</p>
      <div className={s.ctaBtns}>
        <Link className={s.ctaPrimary} href="/rights">권리분석 무료 체험</Link>
        <Link className={s.ctaGhost} href="/price-map">시세지도 바로가기</Link>
      </div>
    </section>
  );
}
