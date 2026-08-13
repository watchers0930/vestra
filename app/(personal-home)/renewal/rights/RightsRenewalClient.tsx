"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import s from "./rights-renewal.module.css";

type TabId = "analysis" | "owner" | "history" | "guide";
type ModeId = "addr" | "file";

export default function RightsRenewalClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("analysis");
  const [mode, setMode] = useState<ModeId>("addr");
  const [addrValue, setAddrValue] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const snavRef = useRef<HTMLDivElement>(null);

  const handleTabClick = (tab: TabId) => {
    setActiveTab(tab);
    if (snavRef.current) {
      window.scrollTo({ top: snavRef.current.offsetTop - 80, behavior: "smooth" });
    }
  };

  const handleAddrInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddrValue(e.target.value);
  };

  const handleConfirmAddr = () => {
    if (!addrValue.trim()) return;
    setShowDetail(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  return (
    <>
      {/* NAV */}
      <nav>
        <div className={s.navInner}>
          <Link href="/home" className={s.navLogo}>
            <div className={s.logoIcon}>V</div>
            <span className={s.logoText}>VESTRA</span>
          </Link>
          <ul className={s.navMenu}>
            <li><Link href="/listings">매물검색</Link></li>
            <li><Link href="/jeonse">전세보호</Link></li>
            <li><Link href="/rights" className="active">권리분석</Link></li>
            <li><Link href="/monitoring">등기감시</Link></li>
            <li><Link href="/contract">계약검토</Link></li>
            <li><Link href="/prediction">시세지도</Link></li>
            <li><Link href="/expert-connect">전문가상담</Link></li>
          </ul>
          <div className={s.navAuth}>
            <a href="#">홍길동</a><span className={s.div}>|</span>
            <a href="#">마이페이지</a><span className={s.div}>|</span>
            <a href="#">로그아웃</a>
          </div>
          <button
            className={s.navBurger}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
        <ul className={`${s.navMob} ${menuOpen ? s.open : ""}`}>
          <li><Link href="/listings">매물검색</Link></li>
          <li><Link href="/jeonse">전세보호</Link></li>
          <li><Link href="/rights">권리분석</Link></li>
          <li><Link href="/monitoring">등기감시</Link></li>
          <li><Link href="/contract">계약검토</Link></li>
          <li><Link href="/prediction">시세지도</Link></li>
          <li><Link href="/expert-connect">전문가상담</Link></li>
        </ul>
      </nav>

      {/* SUB HERO */}
      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>AI Rights Analysis</span>
          <h1>권리분석</h1>
          <p className={s.subHeroSub}>갑구·을구 권리관계를 AI가 종합 분석하여 위험도와 투자 적합성을 판단합니다</p>
        </div>
      </section>

      {/* SUB NAV */}
      <div className={s.snavWrap} ref={snavRef}>
        <div className={s.snavIn}>
          <nav className={s.snav}>
            <button
              className={`${s.snavBtn} ${activeTab === "analysis" ? s.on : ""}`}
              onClick={() => handleTabClick("analysis")}
            >
              권리관계 분석
            </button>
            <button
              className={`${s.snavBtn} ${activeTab === "owner" ? s.on : ""}`}
              onClick={() => handleTabClick("owner")}
            >
              소유자 · 매도인 확인
            </button>
            <button
              className={`${s.snavBtn} ${activeTab === "history" ? s.on : ""}`}
              onClick={() => handleTabClick("history")}
            >
              등기이력 조회
            </button>
            <button
              className={`${s.snavBtn} ${activeTab === "guide" ? s.on : ""}`}
              onClick={() => handleTabClick("guide")}
            >
              이용 안내
            </button>
          </nav>
        </div>
      </div>

      {/* PANEL: 권리관계 분석 */}
      <div className={`${s.tab} ${activeTab === "analysis" ? s.on : ""}`}>
        <div className={s.panelWrap}>

          {/* 2-col: 입력(35) | 결과(65) */}
          <div className={s.analysisGrid}>

            {/* Left 35: 입력 폼 */}
            <div className={s.analysisSticky}>
              <div className={s.acard}>
                <div className={s.acardHead}>
                  <div className={s.modePills}>
                    <button
                      className={`${s.modePill} ${mode === "addr" ? s.on : ""}`}
                      onClick={() => setMode("addr")}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                      </svg>
                      주소 조회
                    </button>
                    <button
                      className={`${s.modePill} ${mode === "file" ? s.on : ""}`}
                      onClick={() => setMode("file")}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      파일 업로드
                    </button>
                  </div>
                </div>

                <div className={s.acardBody}>

                  {/* 주소 조회 모드 */}
                  {mode === "addr" && (
                    <div>
                      <div className={s.addrSearchRow}>
                        <input
                          className={`${s.addrInput} ${s.addrMain} ${addrValue ? s.filled : ""}`}
                          type="text"
                          placeholder="도로명 또는 지번 주소 입력"
                          value={addrValue}
                          onChange={handleAddrInput}
                        />
                        <button className={s.addrSearchBtn} onClick={handleConfirmAddr}>조회</button>
                      </div>
                      {showDetail && (
                        <input
                          className={`${s.addrInput} ${s.addrDetail}`}
                          type="text"
                          placeholder="동, 호수 입력 (예: 101동 1504호)"
                          style={{ marginTop: "8px" }}
                          autoFocus
                        />
                      )}
                      <p className={s.addrHint} style={{ marginTop: "8px" }}>
                        건축물대장 + 실거래가 공공데이터 기반으로 분석합니다.<br />
                        아파트·공동주택은 동·호수까지 입력하면 더 정확합니다.
                      </p>
                    </div>
                  )}

                  {/* 파일 업로드 모드 */}
                  {mode === "file" && (
                    <div>
                      <div className={s.addrSearchRow}>
                        <input
                          className={`${s.addrInput} ${s.addrMain} ${fileName ? s.filled : ""}`}
                          type="text"
                          placeholder="등기부등본 파일을 선택하세요"
                          value={fileName}
                          readOnly
                        />
                        <button
                          className={s.addrSearchBtn}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          파일 선택
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                      />
                      <p className={s.addrHint} style={{ marginTop: "8px" }}>
                        PDF · JPG · PNG · 최대 10MB — AI가 자동으로 텍스트를 추출합니다
                      </p>
                    </div>
                  )}

                  {/* 추정 시세 입력 */}
                  <div className={s.priceBox}>
                    <div className={s.priceLabel}>추정 시세 (선택사항)</div>
                    <div className={s.priceInputRow}>
                      <input
                        className={s.priceInput}
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="예: 8.5"
                      />
                      <span className={s.priceUnit}>억 원</span>
                    </div>
                    <div className={s.priceHint}>MOLIT 실거래 데이터가 있으면 자동으로 시세를 반영합니다</div>
                  </div>

                  {/* 분석 버튼 */}
                  <button className={s.analyzeBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    종합 권리분석 시작
                  </button>

                </div>
              </div>
            </div>

            {/* Right 65: 분석 결과 샘플 */}
            <div>
              <div className={s.rcard}>
                <div>
                  <div className={s.rcardEyebrow}>Sample Analysis</div>
                  <div className={s.rcardTitle} style={{ marginTop: "4px" }}>이런 형태로 결과가 제공됩니다</div>
                  <div className={s.rcardAddr}>서울특별시 강남구 역삼동 826-22, 3층 301호</div>
                </div>

                {/* 점수 + 판정 */}
                <div className={s.scoreRow}>
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div className={s.gaugeWrap}>
                      <svg width="130" height="130" viewBox="0 0 156 156">
                        <circle cx="78" cy="78" r="58" fill="none" stroke="#f0f2f6" strokeWidth="13" />
                        <circle cx="78" cy="78" r="58" fill="none" stroke="#f59e0b" strokeWidth="13"
                          strokeDasharray="226.2 364.4" strokeLinecap="round" transform="rotate(-90 78 78)" />
                      </svg>
                      <div className={s.gaugeMid}>
                        <div className={s.gaugeN}>62</div>
                        <div className={s.gaugeU}>/ 100점</div>
                      </div>
                    </div>
                    <div>
                      <span className={s.gaugeGrade} style={{ color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a" }}>
                        ⚠ 주의 필요
                      </span>
                    </div>
                  </div>
                  <div className={s.scoreMeta}>
                    <div className={s.scoreVerdict}>권리관계 주의 — 계약 전 확인 필요</div>
                    <div style={{ fontSize: "12.5px", color: "#999", marginBottom: "10px" }}>
                      2026.08.10 분석 완료 · 갑구 3건 / 을구 2건
                    </div>
                    <div className={s.scoreBadges}>
                      <span className={`${s.sbadge} ${s.sbadgeD}`}>⚠ 근저당 1건</span>
                      <span className={`${s.sbadge} ${s.sbadgeW}`}>! 가처분 확인 필요</span>
                      <span className={`${s.sbadge} ${s.sbadgeS}`}>✓ 소유자 일치</span>
                      <span className={`${s.sbadge} ${s.sbadgeS}`}>✓ 예고등기 없음</span>
                    </div>
                  </div>
                </div>

                {/* KPI */}
                <div className={s.kpiRow}>
                  <div className={s.kpiCard}>
                    <div className={s.kpiLabel}>선순위채권 총액</div>
                    <div className={s.kpiVal}>1<span className={s.kpiUnit}>억 2천</span></div>
                    <div className={s.kpiTag} style={{ color: "#b45309" }}>시세 대비 15%</div>
                  </div>
                  <div className={s.kpiCard}>
                    <div className={s.kpiLabel}>소유자 수</div>
                    <div className={s.kpiVal}>1<span className={s.kpiUnit}>인</span></div>
                    <div className={s.kpiTag} style={{ color: "#15803d" }}>단독 소유</div>
                  </div>
                  <div className={s.kpiCard}>
                    <div className={s.kpiLabel}>위험 등기</div>
                    <div className={s.kpiVal}>1<span className={s.kpiUnit}>건</span></div>
                    <div className={s.kpiTag} style={{ color: "#b45309" }}>근저당 주의</div>
                  </div>
                </div>

                {/* 갑구 분석 */}
                <div className={s.regSection}>
                  <div className={s.regSecHead}>
                    <span className={`${s.regSecBadge} ${s.badgeGab}`}>갑구</span>
                    <span className={s.regSecTitle}>소유권에 관한 사항</span>
                    <span className={s.regSecSub}>3건</span>
                  </div>
                  <div className={s.regItems}>
                    <div className={`${s.ri} ${s.riS}`}>
                      <div className={`${s.riDot} ${s.dotS}`}></div>
                      <div style={{ flex: 1 }}>
                        <div className={s.riLabel}>소유권이전 — 김○○ (매매, 2021.03.15)</div>
                        <div className={s.riDetail}>현재 소유자 확인 · 등기부상 소유자와 매도인 일치</div>
                      </div>
                      <span className={s.riBadge}>안전</span>
                    </div>
                    <div className={`${s.ri} ${s.riW}`}>
                      <div className={`${s.riDot} ${s.dotW}`}></div>
                      <div style={{ flex: 1 }}>
                        <div className={s.riLabel}>가처분 — 박○○ (2023.07.22)</div>
                        <div className={s.riDetail}>소유권 이전 제한 가처분 · 말소 여부 법원 확인 필요</div>
                      </div>
                      <span className={s.riBadge}>주의</span>
                    </div>
                    <div className={`${s.ri} ${s.riS}`}>
                      <div className={`${s.riDot} ${s.dotS}`}></div>
                      <div style={{ flex: 1 }}>
                        <div className={s.riLabel}>압류 없음 · 예고등기 없음</div>
                        <div className={s.riDetail}>경매개시결정·신탁등기·가등기 없음</div>
                      </div>
                      <span className={s.riBadge}>안전</span>
                    </div>
                  </div>
                </div>

                {/* 을구 분석 */}
                <div className={s.regSection}>
                  <div className={s.regSecHead}>
                    <span className={`${s.regSecBadge} ${s.badgeEul}`}>을구</span>
                    <span className={s.regSecTitle}>소유권 외의 권리에 관한 사항</span>
                    <span className={s.regSecSub}>2건</span>
                  </div>
                  <div className={s.regItems}>
                    <div className={`${s.ri} ${s.riW}`}>
                      <div className={`${s.riDot} ${s.dotW}`}></div>
                      <div style={{ flex: 1 }}>
                        <div className={s.riLabel}>근저당권 — ○○은행 채권최고액 1억 4,400만 원 (2021.03.15)</div>
                        <div className={s.riDetail}>실제 대출 추정 1억 2,000만 원 · 잔금 시 말소 특약 확인 필요</div>
                      </div>
                      <span className={s.riBadge}>주의</span>
                    </div>
                    <div className={`${s.ri} ${s.riS}`}>
                      <div className={`${s.riDot} ${s.dotS}`}></div>
                      <div style={{ flex: 1 }}>
                        <div className={s.riLabel}>전세권 없음 · 지상권 없음</div>
                        <div className={s.riDetail}>추가 담보권 설정 없음</div>
                      </div>
                      <span className={s.riBadge}>안전</span>
                    </div>
                  </div>
                </div>

                {/* AI 권고 */}
                <div className={s.aiBox}>
                  <span className={s.aiIco}>✦</span>
                  <p className={s.aiTxt}>
                    갑구의 가처분 등기가 확인됩니다. 잔금 전 법원에서 가처분 취소·말소 여부를 반드시 확인하세요.
                    을구의 근저당은 잔금 시 동시 말소 특약을 계약서에 명시하면 안전하게 거래할 수 있습니다.
                  </p>
                </div>

                <div className={s.rnote}>
                  ※ 위 결과는 시안 예시입니다. AI 분석은 참고용이며 법적 효력이 없습니다. 중요한 거래는 반드시 전문가 확인을 받으세요.
                </div>
              </div>
            </div>

          </div>{/* /analysis-grid */}

          {/* 6대 분석 항목 */}
          <p className={s.secEyebrow}>Analysis Scope</p>
          <h2 className={s.secTitle}>6대 권리분석 항목</h2>
          <p className={s.secDesc}>VESTRA는 등기부등본의 핵심 권리관계를 6가지 항목으로 나누어 AI가 자동 분석합니다.</p>
          <div className={s.cardsGrid}>
            <div className={s.pcard}>
              <div className={s.pcardIcon}>
                <svg viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className={s.pcardTitle}>갑구 권리관계 분석</div>
              <div className={s.pcardDesc}>소유권이전 이력, 압류·가압류·예고등기·가처분·가등기 등 소유권 관련 이상 등기를 탐지합니다.</div>
              <span className={`${s.pcardTag} ${s.tagR}`}>핵심 위험 항목</span>
            </div>
            <div className={s.pcard}>
              <div className={s.pcardIcon}>
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className={s.pcardTitle}>을구 담보권 분석</div>
              <div className={s.pcardDesc}>근저당·전세권·지상권·지역권 등 담보권 현황과 채권최고액을 계산하여 실질 부채를 산정합니다.</div>
              <span className={`${s.pcardTag} ${s.tagC}`}>요주의</span>
            </div>
            <div className={s.pcard}>
              <div className={s.pcardIcon}>
                <svg viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className={s.pcardTitle}>소유자 · 매도인 일치 확인</div>
              <div className={s.pcardDesc}>등기부상 소유자와 계약 상대방이 동일인인지 확인합니다. 불일치 시 사기 거래 위험이 높습니다.</div>
              <span className={`${s.pcardTag} ${s.tagR}`}>필수 확인</span>
            </div>
            <div className={s.pcard}>
              <div className={s.pcardIcon}>
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div className={s.pcardTitle}>LTV · 선순위채권 산정</div>
              <div className={s.pcardDesc}>선순위 근저당 총액을 시세 대비로 계산하여 보증금 회수 가능성을 수치화합니다.</div>
              <span className={`${s.pcardTag} ${s.tagC}`}>자동 계산</span>
            </div>
            <div className={s.pcard}>
              <div className={s.pcardIcon}>
                <svg viewBox="0 0 24 24">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className={s.pcardTitle}>고위험 등기 집중 탐지</div>
              <div className={s.pcardDesc}>경매개시결정·신탁등기·가등기 등 거래 자체를 위험하게 만드는 등기를 우선 탐지합니다.</div>
              <span className={`${s.pcardTag} ${s.tagR}`}>AI 자동 탐지</span>
            </div>
            <div className={s.pcard}>
              <div className={s.pcardIcon}>
                <svg viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className={s.pcardTitle}>투자 적합성 종합 판단</div>
              <div className={s.pcardDesc}>권리관계 분석 결과를 바탕으로 매수·전세·투자 관점에서의 종합 적합성을 AI가 판단합니다.</div>
              <span className={`${s.pcardTag} ${s.tagS}`}>AI 종합 판정</span>
            </div>
          </div>

          {/* 이용 절차 */}
          <p className={s.secEyebrow}>How It Works</p>
          <h2 className={s.secTitle}>분석은 4단계로 진행됩니다</h2>
          <div className={s.procSteps}>
            <div className={s.pstep}>
              <div className={`${s.pstepN} ${s.pn1}`}>01</div>
              <div className={s.pstepT}>등기부 입력</div>
              <div className={s.pstepD}>주소 조회·파일 업로드·텍스트 붙여넣기 중 편한 방법으로 입력합니다.</div>
            </div>
            <div className={s.pstep}>
              <div className={`${s.pstepN} ${s.pn2}`}>02</div>
              <div className={s.pstepT}>텍스트 추출</div>
              <div className={s.pstepD}>PDF·이미지에서 AI가 등기부 내용을 자동 추출하고 구조화합니다.</div>
            </div>
            <div className={s.pstep}>
              <div className={`${s.pstepN} ${s.pn3}`}>03</div>
              <div className={s.pstepT}>AI 권리 분석</div>
              <div className={s.pstepD}>갑구·을구 권리관계를 6개 항목으로 나누어 위험도를 점수화합니다.</div>
            </div>
            <div className={s.pstep}>
              <div className={`${s.pstepN} ${s.pn4}`}>04</div>
              <div className={s.pstepT}>리포트 제공</div>
              <div className={s.pstepD}>항목별 상세 분석 결과와 AI 권고사항을 리포트로 제공합니다.</div>
            </div>
          </div>

          {/* CTA */}
          <div className={s.ctaSec}>
            <div className={s.ctaIn}>
              <h2 className={s.ctaT}>지금 무료로 권리분석을 시작하세요</h2>
              <p className={s.ctaD}>
                등기부등본 없이 주소만으로도 간이 분석이 가능합니다.<br />
                VESTRA AI가 권리관계 위험 요소를 빠르게 알려드립니다.
              </p>
              <div className={s.ctaBtns}>
                <button className={s.ctaP}>무료 분석 시작하기</button>
                <button className={s.ctaO}>서비스 소개 보기</button>
              </div>
              <div className={s.ctaBadges}>
                <span className={s.ctaBadge}>무료 이용</span>
                <span className={s.ctaBadge}>회원가입 불필요</span>
              </div>
            </div>
          </div>

        </div>{/* /panel-wrap */}
      </div>{/* /tab-analysis */}

      {/* PANEL: 소유자·매도인 확인 */}
      <div className={`${s.tab} ${activeTab === "owner" ? s.on : ""}`}>
        <div className={s.panelWrap} style={{ maxWidth: "860px" }}>
          <p className={s.secEyebrow}>Owner Verification</p>
          <h2 className={s.secTitle}>소유자 · 매도인 확인</h2>
          <p className={s.secDesc}>
            등기부등본상 소유자와 계약 상대방이 동일인인지 확인합니다.<br />
            불일치 시 사기 거래의 위험이 매우 높습니다.
          </p>
        </div>
      </div>

      {/* PANEL: 등기이력 조회 */}
      <div className={`${s.tab} ${activeTab === "history" ? s.on : ""}`}>
        <div className={s.panelWrap} style={{ maxWidth: "860px" }}>
          <p className={s.secEyebrow}>Registry History</p>
          <h2 className={s.secTitle}>등기이력 조회</h2>
          <p className={s.secDesc}>소유권 변동 이력, 담보권 설정·말소 이력을 시계열로 확인합니다.</p>
        </div>
      </div>

      {/* PANEL: 이용 안내 */}
      <div className={`${s.tab} ${activeTab === "guide" ? s.on : ""}`}>
        <div className={s.panelWrap} style={{ maxWidth: "860px" }}>
          <p className={s.secEyebrow}>User Guide</p>
          <h2 className={s.secTitle}>이용 안내</h2>
          <p className={s.secDesc}>권리분석 서비스 이용 방법과 주의사항을 안내합니다.</p>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className={s.footerIn}>
          <div>
            <div className={s.flogo}>
              <div className={s.flogoI}>V</div>
              <span className={s.flogoT}>VESTRA</span>
            </div>
            <p className={s.ftag}>The Digital Curator of Real Estate<br />AI 기반 부동산 자산관리 플랫폼</p>
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
              <li><a href="#">개인정보처리방침</a></li>
              <li><a href="#">이용약관</a></li>
            </ul>
          </div>
          <div>
            <p className={s.fcolT}>Product</p>
            <ul className={s.flinks}>
              <li><a href="#">기능 소개</a></li>
              <li><a href="#">요금제</a></li>
            </ul>
          </div>
          <div>
            <p className={s.fcolT}>Company</p>
            <ul className={s.flinks}>
              <li><a href="#">회사 소개</a></li>
              <li><a href="#">채용</a></li>
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
    </>
  );
}
