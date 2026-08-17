"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import s from "./listing-detail-mobile.module.css";
import DetailTabs from "../listing-detail/DetailTabs";
import MapThumbnail from "../listing-detail/MapThumbnail";
import { ApplicationModal } from "@/app/(app)/listings/[id]/components/ApplicationModal";

function formatKoreanWon(won: number): string {
  if (!won) return "-";
  const eok = Math.floor(won / 100_000_000);
  const man = Math.floor((won % 100_000_000) / 10_000);
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

interface AptInfo {
  kapt: { households: number | null; approvalDate: string | null; heatingType: string | null; parkingTotal: number | null; corridorType: string | null; constructorName: string | null } | null;
  official: { price: number | null; year: number | null } | null;
}

export default function ListingDetailMobileClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const region = sp.get("region") || "강남구";
  const dong = sp.get("dong") || "";
  const aptName = sp.get("apt") || "매물";
  const area = sp.get("area") || "";
  const floor = sp.get("floor") || "";
  const amount = Number(sp.get("amount") || "0");
  const dealDate = sp.get("dealDate") || "";
  const buildYear = sp.get("buildYear") || "";
  const lat = sp.get("lat") ? Number(sp.get("lat")) : null;
  const lng = sp.get("lng") ? Number(sp.get("lng")) : null;

  const [info, setInfo] = useState<AptInfo | null>(null);
  const [showIntent, setShowIntent] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams({ region, dong, apt: aptName });
    if (lat != null && lng != null) { q.set("lat", String(lat)); q.set("lng", String(lng)); }
    fetch(`/api/listings/apt-info?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInfo(d))
      .catch(() => setInfo(null));
  }, [region, dong, aptName, lat, lng]);

  const kapt = info?.kapt;
  const official = info?.official;

  return (
    <div className={s.pageRoot}>
      {/* STICKY NAV */}
      <nav className={s.mNav}>
        <button className={s.mNavBack} onClick={() => router.back()} aria-label="뒤로가기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className={s.mNavTitle}>매물상세</span>
        <button className={s.mNavShare} aria-label="공유">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
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

      {/* MAIN CONTENT */}
      <div className={s.mContent}>

        {/* 사진 (국토부 실거래 — 좌표 있으면 지도 썸네일, 없으면 안내) */}
        <div className={s.photoGallery}>
          {lat != null && lng != null ? (
            <div className={s.photoMain} style={{ position: "relative", minHeight: 240, overflow: "hidden" }}>
              <MapThumbnail lat={lat} lng={lng} minHeight={240} />
              <span style={{ position: "absolute", top: 10, left: 10, zIndex: 2, background: "rgba(15,37,71,.85)", color: "#fff", fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 7 }}>
                실거래 위치 · 사진은 안심인증 등록 시 제공
              </span>
            </div>
          ) : (
            <div
              className={s.photoMain}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 240, background: "#f1f5f9", color: "#94a3b8" }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 500 }}>등록된 사진이 없습니다</span>
              <span style={{ fontSize: 11 }}>안심인증 매물 등록 시 사진이 제공됩니다</span>
            </div>
          )}
          <div className={s.photoBadgeRow}>
            <span className={`${s.photoBadge} ${s.pbSale}`}>매매</span>
            <span className={`${s.photoBadge} ${s.pbStatus}`}>국토부 실거래</span>
          </div>
        </div>

        {/* 매물 정보 카드 */}
        <div className={s.propCard}>
          <div className={s.propCardHeader}>
            <div className={s.listingTrustTag}>국토부 실거래</div>
            <h1 className={s.listingName}>{aptName}</h1>
            <p className={s.listingAddrText}>{region} {dong}</p>
            <div className={s.listingPrice}>{formatKoreanWon(amount)}</div>
            <span className={s.listingTypeBadge}>매매</span>
          </div>

          <div className={s.listingMeta}>
            <div className={s.metaItem}>
              <div className={s.metaLabel}>건물유형</div>
              <div className={s.metaValue}>아파트</div>
            </div>
            <div className={s.metaItem}>
              <div className={s.metaLabel}>전용면적</div>
              <div className={s.metaValue}>{area ? `${area}㎡` : "-"}</div>
            </div>
            <div className={s.metaItem}>
              <div className={s.metaLabel}>층수</div>
              <div className={s.metaValue}>{floor ? `${floor}층` : "-"}</div>
            </div>
            <div className={s.metaItem}>
              <div className={s.metaLabel}>준공</div>
              <div className={s.metaValue}>{buildYear ? `${buildYear}년` : (kapt?.approvalDate ?? "-")}</div>
            </div>
            <div className={s.metaItem}>
              <div className={s.metaLabel}>세대수</div>
              <div className={s.metaValue}>{kapt?.households ? `${kapt.households.toLocaleString()}세대` : "-"}</div>
            </div>
            <div className={s.metaItem}>
              <div className={s.metaLabel}>거래일</div>
              <div className={s.metaValue}>{dealDate || "-"}</div>
            </div>
          </div>

          <div className={s.listingRegistrant}>
            <div>
              <div className={s.registrantInfo}>공시가격</div>
              <div className={s.registrantName}>{official?.price ? formatKoreanWon(official.price) : "정보 없음"}</div>
            </div>
            <div className={s.registrantDate}>{official?.year ? `${official.year}년 기준` : ""}</div>
          </div>

          <div className={s.certSection}>
            <div className={s.certHeader}>
              <div className={s.certCheck}>
                <svg viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className={s.certTitle}>안심인증 3종 서류 기준</span>
            </div>
            <div className={s.certItems}>
              <div className={s.certItem}>
                <div className={s.certDot}></div>
                <span className={s.certItemLabel}>등기사항전부증명서</span>
                <span className={s.certItemStatus}>권리관계 확인</span>
              </div>
              <div className={s.certItem}>
                <div className={s.certDot}></div>
                <span className={s.certItemLabel}>건축물대장</span>
                <span className={s.certItemStatus}>건물 정보 확인</span>
              </div>
              <div className={s.certItem}>
                <div className={s.certDot}></div>
                <span className={s.certItemLabel}>재산세납부확인서</span>
                <span className={s.certItemStatus}>납세 이력 확인</span>
              </div>
            </div>
            <button
              onClick={() => router.push("/rights")}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10, padding: 0, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#0071e3", lineHeight: 1.5, textAlign: "left" }}
            >
              등기부 권리관계·부기등기(등록임대주택·명의변경)가 궁금하다면 AI 권리분석 해보기 →
            </button>
          </div>

          <div className={s.descSection}>
            <div className={s.descLabel}>매물 설명</div>
            <p className={s.descText}>
              {region} {dong} {aptName} 단지의 국토교통부 실거래 정보입니다. 전용 {area || "-"}㎡, {floor || "-"}층
              {dealDate ? `, ${dealDate} 거래가 ${formatKoreanWon(amount)}` : ""}. 주변 인프라·학군·시세는 아래 탭에서 확인하세요.
            </p>
          </div>
        </div>

        {/* 위치/인프라/학군/시세 — 실데이터 탭 (PC와 공용) */}
        <DetailTabs region={region} dong={dong} aptName={aptName} lat={lat} lng={lng} />
      </div>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerLogo}>
          <div className={s.flogoIcon}>V</div>
          <span className={s.flogoText}>VESTRA</span>
        </div>
        <p className={s.footerTagline}>The Digital Curator of Real Estate<br />AI 기반 부동산 자산관리 플랫폼</p>
        <div className={s.footerContact}>
          BMI C&amp;S | 대표이사 김동의<br />
          사업자등록번호 263-87-03481<br />
          통신판매신고번호 2025-경기광명-0189<br />
          서울시 강남구 강남대로 354 혜천빌딩 1126-5호<br />
          고객센터 010-8490-9271
        </div>
        <div className={s.footerLinksRow}>
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
          © 2026 BMI-C&amp;S All rights reserved.<br />
          The Digital Curator of Real Estate
        </div>
      </footer>

      {/* STICKY CTA */}
      <div className={s.stickyCta}>
        <button className={s.ctaPrimary} onClick={() => setShowIntent(true)}>의향서 보내기</button>
        <button className={s.ctaSecondary} onClick={() => router.push("/rights")}>AI 권리분석<br />해보기</button>
      </div>

      {showIntent && (
        <ApplicationModal
          demoMode
          listingId=""
          deposit={String(amount)}
          listingType="SALE"
          onClose={() => setShowIntent(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
