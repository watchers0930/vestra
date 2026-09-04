import Link from "next/link";
import Image from "next/image";
import s from "./RealtorFooter.module.css";

/** 사업자 홈 공통 footer — renewal 홈 footer와 동일 정보 */
export default function RealtorFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.footerInner}>
        <div>
          <div className={s.footerLogo}>
            <Image src="/vestra-symbol.png" alt="VESTRA" width={26} height={26} className={s.flogoIcon} />
            <span className={s.flogoText}>VESTRA</span>
          </div>
          <p className={s.footerTagline}>
            The Digital Curator of Real Estate<br />
            AI 기반 부동산 자산관리 플랫폼
          </p>
          <div className={s.footerContact}>
            BMI C&amp;S | 대표이사 김동의<br />
            사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189<br />
            서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호<br />
            고객센터 010-8490-9271
          </div>
        </div>
        <div>
          <p className={s.footerColTitle}>Legal</p>
          <ul className={s.footerLinks}>
            <li><Link href="/privacy">개인정보처리방침</Link></li>
            <li><Link href="/terms">이용약관</Link></li>
          </ul>
        </div>
        <div>
          <p className={s.footerColTitle}>Product</p>
          <ul className={s.footerLinks}>
            <li><Link href="/realtor">중개사 홈</Link></li>
            <li><Link href="/pricing">요금제</Link></li>
          </ul>
        </div>
        <div>
          <p className={s.footerColTitle}>Company</p>
          <ul className={s.footerLinks}>
            <li><Link href="#">회사 소개</Link></li>
            <li><Link href="#">채용</Link></li>
            <li><Link href="#">뉴스레터</Link></li>
          </ul>
        </div>
        <div>
          <p className={s.footerColTitle}>Connect</p>
          <ul className={s.footerLinks}>
            <li><Link href="#">LinkedIn</Link></li>
          </ul>
        </div>
      </div>
      <div className={s.footerBottom}>
        <span>© 2026 BMI-C&amp;S All rights reserved.</span>
        <span>The Digital Curator of Real Estate</span>
      </div>
    </footer>
  );
}
