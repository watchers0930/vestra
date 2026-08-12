import "./landing.css";
import Link from "next/link";
import { LandingNav } from "./components/LandingNav";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingNav />
      <main>{children}</main>
      <footer className="lnd-footer">
        <div className="lnd-ft-inner">
          <div className="lnd-ft-top">
            <div>
              <div className="lnd-ft-logo">VESTRA</div>
              <div className="lnd-ft-tag">The Digital Curator of Real Estate.<br />AI 기반 부동산 자산관리 플랫폼.</div>
              <div className="lnd-ft-biz">
                BMI C&amp;S | 대표이사 김동의<br />
                사업자등록번호 263-87-03481<br />
                통신판매신고번호 2025-경기광명-0189<br />
                서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호<br />
                고객센터 010-8490-9271
              </div>
            </div>
            <div className="lnd-ft-cols">
              <div className="lnd-ft-col">
                <h5>Legal</h5>
                <ul>
                  <li><Link href="/privacy">개인정보 처리방침</Link></li>
                  <li><Link href="/terms">이용약관</Link></li>
                </ul>
              </div>
              <div className="lnd-ft-col">
                <h5>Product</h5>
                <ul>
                  <li><Link href="/login">기능 소개</Link></li>
                  <li><Link href="/login">요금제</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="lnd-ft-bottom">
            <span className="lnd-ft-copy">© 2026 BMI C&amp;S All rights reserved.</span>
            <span className="lnd-ft-copy">The Digital Curator of Real Estate</span>
          </div>
        </div>
      </footer>
    </>
  );
}
