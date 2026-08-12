import Link from "next/link";

export function CtaSection() {
  return (
    <section className="lnd-cta" aria-labelledby="cta-h">
      <div className="lnd-cta-body">
        <h2 className="lnd-cta-h" id="cta-h">지금 바로<br />시작하세요</h2>
        <p className="lnd-cta-p">로그인 없이 시세지도, 공시가격, 세금계산을 바로 이용하세요</p>
        <div className="lnd-cta-btns">
          <Link href="/price-map" className="lnd-cb-p">시세지도 바로가기</Link>
          <Link href="/rights" className="lnd-cb-g">권리분석 무료 체험</Link>
        </div>
      </div>
    </section>
  );
}
