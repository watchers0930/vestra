import Link from "next/link";
import s from "../expert.module.css";

/** 랜딩형 푸터 (회사 정보 + 링크 그룹). 정적. */
export default function ExpertFooter() {
  return (
    <footer className={s.footerBar}>
      <div className={s.footerIn}>
        <div>
          <div className={s.flogo}>
            <div className={s.flogoI}>V</div>
            <span className={s.flogoT}>VESTRA</span>
          </div>
          <p className={s.ftagFoot}>The Digital Curator of Real Estate<br />AI 기반 부동산 자산관리 플랫폼</p>
          <div className={s.fcontact}>
            BMI C&amp;S | 대표이사 김동의<br />
            사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189<br />
            서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호<br />
            고객센터 010-8490-9271
          </div>
        </div>
        <div>
          <p className={s.fcolT}>Legal</p>
          <ul className={s.flinks}>
            <li><Link href="/privacy">개인정보처리방침</Link></li>
            <li><Link href="/terms">이용약관</Link></li>
          </ul>
        </div>
        <div>
          <p className={s.fcolT}>Product</p>
          <ul className={s.flinks}>
            <li><Link href="/renewal/expert">기능 소개</Link></li>
            <li><Link href="/pricing">요금제</Link></li>
          </ul>
        </div>
        <div>
          <p className={s.fcolT}>Company</p>
          <ul className={s.flinks}>
            <li><Link href="/legal">회사 소개</Link></li>
            <li><a href="#">채용</a></li>
            <li><a href="#">뉴스레터</a></li>
          </ul>
        </div>
        <div>
          <p className={s.fcolT}>Connect</p>
          <ul className={s.flinks}>
            <li><a href="#">LinkedIn</a></li>
          </ul>
        </div>
      </div>
      <div className={s.fbot}>
        <span>© 2026 BMI-C&amp;S All rights reserved.</span>
        <span>The Digital Curator of Real Estate</span>
      </div>
    </footer>
  );
}
