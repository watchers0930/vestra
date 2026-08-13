"use client";

import { useState, useEffect, useRef } from "react";
import s from "./listing-detail-mobile.module.css";

const PHOTOS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&auto=format&fit=crop&q=80",
];

const PRICE_DATA = [
  { month: "2월", avg: 131000 },
  { month: "3월", avg: 132500 },
  { month: "4월", avg: 133750 },
  { month: "5월", avg: 134333 },
  { month: "6월", avg: 132000 },
  { month: "7월", avg: 135000 },
];

type TabKey = "tab-map" | "tab-infra" | "tab-school" | "tab-price";

export default function ListingDetailMobileClient() {
  const [activePhoto, setActivePhoto] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>("tab-map");
  const [activeInfraChip, setActiveInfraChip] = useState("ALL");
  const [activeSchoolChip, setActiveSchoolChip] = useState("ALL");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartDrawnRef = useRef(false);

  function handlePhotoChange(idx: number) {
    setActivePhoto(idx);
  }

  function handleTabSwitch(tab: TabKey) {
    setActiveTab(tab);
    if (tab === "tab-price") {
      setTimeout(() => drawPriceChart(), 50);
    }
  }

  function drawPriceChart() {
    if (chartDrawnRef.current) return;
    const canvas = chartRef.current;
    if (!canvas || !canvas.getContext) return;
    chartDrawnRef.current = true;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.parentElement?.clientWidth ?? 300;
    const cssH = 180;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const padL = 52, padR = 12, padT = 12, padB = 32;
    const W = cssW - padL - padR;
    const H = cssH - padT - padB;

    const vals = PRICE_DATA.map((d) => d.avg);
    const maxV = Math.max(...vals);
    const chartMax = Math.ceil(maxV / 10000) * 10000 + 10000;
    const chartMin = 0;
    const range = chartMax - chartMin;
    const steps = 4;

    ctx.textAlign = "right";
    ctx.font = "9px -apple-system, sans-serif";
    ctx.fillStyle = "#aaa";
    for (let i = 0; i <= steps; i++) {
      const v = chartMin + (range / steps) * i;
      const y = padT + H - (H * (v - chartMin)) / range;
      const label = v === 0 ? "0만" : (v / 10000).toFixed(0) + "억";
      ctx.fillText(label, padL - 5, y + 3);
      ctx.strokeStyle = "#e8eaf0";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + W, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const barW = Math.min(34, (W / PRICE_DATA.length) * 0.52);
    const slotW = W / PRICE_DATA.length;
    ctx.textAlign = "center";
    ctx.font = "9px -apple-system, sans-serif";

    PRICE_DATA.forEach((d, i) => {
      const x = padL + slotW * i + slotW / 2;
      const barH = (H * (d.avg - chartMin)) / range;
      const barY = padT + H - barH;
      const r = 3;

      ctx.fillStyle = "#bfdbfe";
      ctx.beginPath();
      ctx.moveTo(x - barW / 2 + r, barY);
      ctx.lineTo(x + barW / 2 - r, barY);
      ctx.quadraticCurveTo(x + barW / 2, barY, x + barW / 2, barY + r);
      ctx.lineTo(x + barW / 2, padT + H);
      ctx.lineTo(x - barW / 2, padT + H);
      ctx.lineTo(x - barW / 2, barY + r);
      ctx.quadraticCurveTo(x - barW / 2, barY, x - barW / 2 + r, barY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#888";
      ctx.fillText(d.month, x, padT + H + 16);
    });
  }

  useEffect(() => {
    if (activeTab === "tab-price") {
      drawPriceChart();
    }
  }, [activeTab]);

  return (
    <div className={s.pageRoot}>
      {/* STICKY NAV */}
      <nav className={s.mNav}>
        <button
          className={s.mNavBack}
          onClick={() => window.history.back()}
          aria-label="뒤로가기"
        >
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

        {/* 사진 갤러리 */}
        <div className={s.photoGallery}>
          <img
            className={s.photoMain}
            src={PHOTOS[activePhoto]}
            alt={`대치아이파크 사진 ${activePhoto + 1}`}
          />
          <div className={s.photoBadgeRow}>
            <span className={`${s.photoBadge} ${s.pbSale}`}>매매</span>
            <span className={`${s.photoBadge} ${s.pbStatus}`}>거래중</span>
          </div>
          <span className={s.photoCounter}>{activePhoto + 1} / {PHOTOS.length}</span>
        </div>
        <div className={s.photoThumbs}>
          <div
            className={`${s.photoThumb} ${activePhoto === 0 ? s.active : ""}`}
            onClick={() => handlePhotoChange(0)}
          >
            <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&auto=format&fit=crop&q=80" alt="썸네일 1" />
          </div>
          <div
            className={`${s.photoThumb} ${activePhoto === 1 ? s.active : ""}`}
            onClick={() => handlePhotoChange(1)}
          >
            <img src="https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=200&auto=format&fit=crop&q=80" alt="썸네일 2" />
          </div>
          <div
            className={`${s.photoThumb} ${activePhoto === 2 ? s.active : ""}`}
            onClick={() => handlePhotoChange(2)}
          >
            <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&auto=format&fit=crop&q=80" alt="썸네일 3" />
          </div>
        </div>

        {/* 매물 정보 카드 */}
        <div className={s.propCard}>
          <div className={s.propCardHeader}>
            <div className={s.listingNum}>매물번호 54</div>
            <div className={s.listingTrustTag}>안심매물</div>
            <h1 className={s.listingName}>대치아이파크</h1>
            <p className={s.listingAddrText}>서울시 강남구 대치동 966</p>
            <div className={s.listingPrice}>13.5억원</div>
            <span className={s.listingTypeBadge}>매매</span>
          </div>

          <div className={s.listingMeta}>
            <div className={s.metaItem}>
              <div className={s.metaLabel}>건물유형</div>
              <div className={s.metaValue}>아파트</div>
            </div>
            <div className={s.metaItem}>
              <div className={s.metaLabel}>전용면적</div>
              <div className={s.metaValue}>84.9㎡</div>
            </div>
            <div className={s.metaItem}>
              <div className={s.metaLabel}>층수</div>
              <div className={s.metaValue}>12 / 25층</div>
            </div>
            <div className={s.metaItem}>
              <div className={s.metaLabel}>관리비</div>
              <div className={s.metaValue}>20만/월</div>
            </div>
          </div>

          <div className={s.listingRegistrant}>
            <div>
              <div className={s.registrantInfo}>등록인</div>
              <div className={s.registrantName}>서울공인중개사</div>
            </div>
            <div className={s.registrantDate}>2026. 7. 24. 등록</div>
          </div>

          <div className={s.certSection}>
            <div className={s.certHeader}>
              <div className={s.certCheck}>
                <svg viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className={s.certTitle}>안전인증 완료</span>
              <span className={s.certDate}>2026. 7. 26.</span>
            </div>
            <div className={s.certItems}>
              <div className={s.certItem}>
                <div className={s.certDot}></div>
                <span className={s.certItemLabel}>등기사항전부증명서</span>
                <span className={s.certItemStatus}>권리관계 확인 완료</span>
              </div>
              <div className={s.certItem}>
                <div className={s.certDot}></div>
                <span className={s.certItemLabel}>건축물대장</span>
                <span className={s.certItemStatus}>건물 정보 확인 완료</span>
              </div>
              <div className={s.certItem}>
                <div className={s.certDot}></div>
                <span className={s.certItemLabel}>재산세납부확인서</span>
                <span className={s.certItemStatus}>납세 이력 확인 완료</span>
              </div>
            </div>
          </div>

          <div className={s.descSection}>
            <div className={s.descLabel}>매물 설명</div>
            <p className={s.descText}>강남구 대치동 학세권 아파트입니다. 남향 배치로 채광이 우수하며 단지 내 조경이 잘 되어 있습니다. 리모델링 완료로 내부 상태 매우 양호합니다. 대치역 도보 5분.</p>
          </div>
        </div>

        {/* 탭 + 지도 */}
        <div className={s.listingTabs}>
          <button
            className={`${s.tabBtn} ${activeTab === "tab-map" ? s.active : ""}`}
            onClick={() => handleTabSwitch("tab-map")}
          >위치</button>
          <button
            className={`${s.tabBtn} ${activeTab === "tab-infra" ? s.active : ""}`}
            onClick={() => handleTabSwitch("tab-infra")}
          >인프라</button>
          <button
            className={`${s.tabBtn} ${activeTab === "tab-school" ? s.active : ""}`}
            onClick={() => handleTabSwitch("tab-school")}
          >학군</button>
          <button
            className={`${s.tabBtn} ${activeTab === "tab-price" ? s.active : ""}`}
            onClick={() => handleTabSwitch("tab-price")}
          >시세</button>
        </div>

        <div className={s.listingMapWrap}>

          {/* 위치 탭 */}
          <div className={s.tabMap} style={{ display: activeTab === "tab-map" ? "flex" : "none" }}>
            <div className={s.mapPlaceholder}>
              <div className={s.mapPlaceholderInner}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2e4bd8" opacity="0.5" />
                </svg>
                <span style={{ color: "#888", fontSize: "14px", marginTop: "8px" }}>지도 영역</span>
              </div>
            </div>
            <div className={s.mapAddrRow}>
              <svg className={s.mapAddrPin} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <span className={s.mapAddrText}>서울시 강남구 대치동 966 대치아이파크</span>
            </div>
          </div>

          {/* 인프라 탭 */}
          <div style={{ display: activeTab === "tab-infra" ? "block" : "none" }}>
            <div className={s.tabFilterRow}>
              {[
                { code: "ALL", label: "전체" },
                { code: "SW8", label: "지하철" },
                { code: "CS2", label: "편의점" },
                { code: "MT1", label: "마트" },
                { code: "CE7", label: "카페" },
                { code: "FD6", label: "음식점" },
                { code: "HP8", label: "병원" },
              ].map((chip) => (
                <button
                  key={chip.code}
                  className={`${s.tabFilterChip} ${activeInfraChip === chip.code ? s.active : ""}`}
                  onClick={() => setActiveInfraChip(chip.code)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className={s.infraMapPlaceholder}>
              <div className={s.mapPlaceholderInner}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2e4bd8" opacity="0.5" />
                </svg>
                <span style={{ color: "#888", fontSize: "14px", marginTop: "8px" }}>지도 영역</span>
              </div>
            </div>
            <div className={s.tabBelowList}>
              <div className={s.tabListHeader}>전체 시설</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "72px" }}>
                <p style={{ fontSize: "11px", color: "#aeaeb2" }}>카카오맵 연동 후 표시됩니다</p>
              </div>
            </div>
          </div>

          {/* 학군 탭 */}
          <div style={{ display: activeTab === "tab-school" ? "block" : "none" }}>
            <div className={s.tabFilterRow}>
              {[
                { key: "ALL", label: "전체" },
                { key: "초등학교", label: "초등" },
                { key: "중학교", label: "중학" },
                { key: "고등학교", label: "고등" },
              ].map((chip) => (
                <button
                  key={chip.key}
                  className={`${s.tabFilterChip} ${activeSchoolChip === chip.key ? s.active : ""}`}
                  onClick={() => setActiveSchoolChip(chip.key)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className={s.schoolMapPlaceholder}>
              <div className={s.mapPlaceholderInner}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2e4bd8" opacity="0.5" />
                </svg>
                <span style={{ color: "#888", fontSize: "14px", marginTop: "8px" }}>지도 영역</span>
              </div>
            </div>
            <div className={s.tabBelowList}>
              <div className={s.tabListHeader}>전체 학교</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "72px" }}>
                <p style={{ fontSize: "11px", color: "#aeaeb2" }}>카카오맵 연동 후 표시됩니다</p>
              </div>
            </div>
          </div>

          {/* 시세 탭 */}
          <div className={s.tabPrice} style={{ display: activeTab === "tab-price" ? "block" : "none" }}>
            <div className={s.tabContentInner}>
              <div className={s.priceTrendHeader}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2e4bd8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                인근 시세 추이 (최근 6개월)
              </div>
              <div className={s.priceCompareBanner}>
                <span>시세 대비 현재 등록가</span>
                <span className={s.priceCompareValue}>-2.1% ↓ 시세 이하</span>
              </div>
              <div className={s.priceChartArea}>
                <canvas ref={chartRef} className={s.priceChartCanvas} height={180} />
              </div>
              <div className={s.priceLegend}>
                <span className={s.priceLegendDot}></span> 평균거래가
              </div>
              <div className={s.priceTableWrap}>
                <table className={s.priceTable}>
                  <thead>
                    <tr>
                      <th>월</th>
                      <th>평균거래가</th>
                      <th>건수</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>2026-02</td><td className={s.priceCol}>131,000만</td><td>1건</td></tr>
                    <tr><td>2026-03</td><td className={s.priceCol}>132,500만</td><td>2건</td></tr>
                    <tr><td>2026-04</td><td className={s.priceCol}>133,750만</td><td>4건</td></tr>
                    <tr><td>2026-05</td><td className={s.priceCol}>134,333만</td><td>3건</td></tr>
                    <tr><td>2026-06</td><td className={s.priceCol}>132,000만</td><td>1건</td></tr>
                    <tr><td>2026-07</td><td className={s.priceCol}>135,000만</td><td>1건</td></tr>
                  </tbody>
                </table>
              </div>
              <p className={s.priceDisclaimer}>국토교통부 실거래가 공개데이터 기반. 실제 거래가와 다를 수 있습니다.</p>
            </div>
          </div>

        </div>
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
        <button className={s.ctaPrimary}>의향서 보내기</button>
        <button className={s.ctaSecondary}>AI 권리분석<br />해보기</button>
      </div>
    </div>
  );
}
