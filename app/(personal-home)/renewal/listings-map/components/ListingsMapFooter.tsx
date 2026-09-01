import Image from "next/image";
import s from "../listings-map.module.css";

export default function ListingsMapFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.footerInner}>
        <div>
          <div className={s.footerLogo}>
            <Image src="/vestra-symbol.png" alt="VESTRA" width={26} height={26} className={s.flogoIcon} />
            <span className={s.flogoText}>VESTRA</span>
          </div>
          <p className={s.footerTagline}>
            The Digital Curator of Real Estate
            <br />
            AI 기반 부동산 자산관리 플랫폼
          </p>
          <div className={s.footerContact}>
            BMI C&S | 대표이사 김동의
            <br />
            사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189
            <br />
            서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호
            <br />
            고객센터 010-8490-9271
          </div>
        </div>
        <div>
          <p className={s.footerColTitle}>Legal</p>
          <ul className={s.footerLinks}>
            <li><a href="#">개인정보처리방침</a></li>
            <li><a href="#">이용약관</a></li>
          </ul>
        </div>
        <div>
          <p className={s.footerColTitle}>Product</p>
          <ul className={s.footerLinks}>
            <li><a href="#">기능 소개</a></li>
            <li><a href="#">요금제</a></li>
          </ul>
        </div>
        <div>
          <p className={s.footerColTitle}>Company</p>
          <ul className={s.footerLinks}>
            <li><a href="#">회사 소개</a></li>
            <li><a href="#">채용</a></li>
            <li><a href="#">뉴스레터</a></li>
          </ul>
        </div>
        <div>
          <p className={s.footerColTitle}>Connect</p>
          <ul className={s.footerLinks}>
            <li><a href="#">LinkedIn</a></li>
          </ul>
        </div>
      </div>
      <div className={s.footerBottom}>
        <span>© 2026 BMI-C&S All rights reserved.</span>
        <span>The Digital Curator of Real Estate</span>
      </div>
    </footer>
  );
}
