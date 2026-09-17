"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import s from "./SiteFooter.module.css";

interface Notice {
  id: string;
  title: string;
  createdAt: string;
}

/**
 * 공통 사이트 푸터 — 여러 페이지에 복제돼 있던 다크 푸터를 하나로 통합.
 * 링크는 개인정보처리방침·이용약관·회사소개·채용 4개를 그룹 헤딩 없이 나열하고,
 * 오른쪽에 최신 공지사항 3건을 표시한다(공개 API에서 로드, 실패/없음 시 안내).
 */
export default function SiteFooter() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcements?limit=3")
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((d) => {
        if (!cancelled) setNotices(d.announcements ?? []);
      })
      .catch(() => {
        /* 공지 로드 실패 시 빈 상태로 표시 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className={s.bar}>
      <div className={s.in}>
        <div>
          <div className={s.logo}>
            <Image src="/vestra-symbol.png" alt="VESTRA" width={26} height={26} className={s.logoI} />
            <span className={s.logoT}>VESTRA</span>
          </div>
          <p className={s.tag}>
            The Digital Curator of Real Estate
            <br />
            AI 기반 부동산 자산관리 플랫폼
          </p>
          <div className={s.contact}>
            BMI C&amp;S | 대표이사 김동의
            <br />
            사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189
            <br />
            서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호
            <br />
            고객센터 010-8490-9271
          </div>
        </div>

        <div className={s.noticeCol}>
          <p className={s.colT}>공지사항</p>
          {notices.length > 0 ? (
            <ul className={s.notices}>
              {notices.map((n) => (
                <li key={n.id} className={s.noticeItem}>
                  <span className={s.noticeTitle}>{n.title}</span>
                  <span className={s.noticeDate}>{new Date(n.createdAt).toLocaleDateString("ko-KR")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.noticeEmpty}>등록된 공지사항이 없습니다.</p>
          )}
        </div>

        <div>
          <ul className={s.links}>
            <li>
              <Link href="/legal">회사소개</Link>
            </li>
            <li>
              <Link href="/privacy">개인정보처리방침</Link>
            </li>
            <li>
              <Link href="/terms">이용약관</Link>
            </li>
            <li>
              <a href="#">채용</a>
            </li>
          </ul>
        </div>
      </div>

      <div className={s.bot}>
        <span>© 2026 BMI-C&amp;S All rights reserved.</span>
        <span>The Digital Curator of Real Estate</span>
      </div>
    </footer>
  );
}
