"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import s from "./listing-detail.module.css";
import ListingDetailContent from "./ListingDetailContent";

export default function ListingDetailClient() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* NAV */}
      <nav>
        <div className={s.navInner}>
          <Link href="/" className={s.navLogo}>
            <div className={s.logoIcon}>V</div>
            <span className={s.logoText}>VESTRA</span>
          </Link>
          <ul className={s.navMenu}>
            <li><Link href="/listings" className="active">매물검색</Link></li>
            <li><Link href="/jeonse">전세보호</Link></li>
            <li><Link href="/rights">관리분석</Link></li>
            <li><Link href="/monitoring">등기감시</Link></li>
            <li><Link href="/contract">계약검토</Link></li>
            <li><Link href="/prediction">시세전망</Link></li>
            <li><Link href="/expert-connect">전문가상담</Link></li>
          </ul>
          <div className={s.navAuth}>
            <Link href="/login">로그인</Link>
            <span className={s.divider}>|</span>
            <Link href="/profile">마이페이지</Link>
            <span className={s.divider}>|</span>
            <Link href="/signup">회원가입</Link>
          </div>
          <button
            className={`${s.navHamburger} ${menuOpen ? s.open : ""}`}
            aria-label="메뉴"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        <ul className={`${s.navMobileMenu} ${menuOpen ? s.open : ""}`}>
          <li><Link href="/listings">매물검색</Link></li>
          <li><Link href="/jeonse">전세보호</Link></li>
          <li><Link href="/rights">관리분석</Link></li>
          <li><Link href="/monitoring">등기감시</Link></li>
          <li><Link href="/contract">계약검토</Link></li>
          <li><Link href="/prediction">시세전망</Link></li>
          <li><Link href="/expert-connect">전문가상담</Link></li>
          <li>
            <div className={s.navMobileAuth}>
              <Link href="/login">로그인</Link>
              <Link href="/profile">마이페이지</Link>
              <Link href="/signup">회원가입</Link>
            </div>
          </li>
        </ul>
      </nav>

      {/* SUB HERO */}
      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroInner}>
          <p className={s.subHeroText}>
            베스트라의 매물은 안심인증등록제로 운영되어<br />
            안심하고 거래할 수 있습니다.
          </p>
        </div>
      </section>

      {/* LISTING SECTION */}
      <ListingDetailContent />

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div>
            <div className={s.footerLogo}>
              <div className={s.flogoIcon}>V</div>
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
          <span>© 2026 BMI-C&amp;S All rights reserved.</span>
          <span>The Digital Curator of Real Estate</span>
        </div>
      </footer>
    </>
  );
}
