"use client";

import { useState } from "react";
import Link from "next/link";
import s from "./price-map-renewal.module.css";
import PriceMapRenewalContent from "./PriceMapRenewalContent";

type DemoView = "map" | "apt" | "risk" | "forecast";

export default function PriceMapRenewalClient() {
  const [demoView, setDemoView] = useState<DemoView>("map");
  const [aptOpen, setAptOpen] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [activeApt, setActiveApt] = useState(0);
  const [tradeMode, setTradeMode] = useState<"buy" | "jeonse">("buy");
  const [chips, setChips] = useState({ apt: true, villa: false, p30: false, p40: false });
  const [fpTab, setFpTab] = useState<"dashboard" | "chart" | "compare" | "backtest" | "anomaly">("dashboard");

  function openApt(idx: number) {
    setActiveApt(idx);
    setAptOpen(true);
  }

  function closeApt() {
    setAptOpen(false);
  }

  function openRisk() {
    setRiskOpen(true);
  }

  function closeRisk() {
    setRiskOpen(false);
  }

  function openForecast() {
    setForecastOpen(true);
  }

  function closeForecast() {
    setForecastOpen(false);
  }

  function setView(v: DemoView) {
    setDemoView(v);
    closeRisk();
    closeForecast();
    if (v === "map") {
      closeApt();
    } else if (v === "apt") {
      openApt(0);
    } else if (v === "risk") {
      openApt(0);
      setTimeout(() => setRiskOpen(true), 300);
    } else if (v === "forecast") {
      openApt(0);
      setTimeout(() => setForecastOpen(true), 300);
    }
  }

  const APTS = [
    { name: "래미안대치팰리스", sub: "강남구 대치동 · 45평형 · 2015년 건축", price: "28억", priceSub: "6,222만원/평", area: "45평", year: "2015년", official: "22억 3천만", chgClass: "acbUp", chgText: "▲ 5.2%" },
    { name: "은마아파트", sub: "강남구 대치동 · 32평형 · 1979년 건축", price: "14억", priceSub: "4,375만원/평", area: "32평", year: "1979년", official: "10억 2천만", chgClass: "acbUp", chgText: "▲ 3.8%" },
    { name: "대치아이파크", sub: "강남구 대치동 · 38평형 · 2007년 건축", price: "22억", priceSub: "5,789만원/평", area: "38평", year: "2007년", official: "17억 5천만", chgClass: "acbUp", chgText: "▲ 2.1%" },
    { name: "도곡렉슬", sub: "강남구 도곡동 · 25평형 · 2002년 건축", price: "18억", priceSub: "7,200만원/평", area: "25평", year: "2002년", official: "14억 1천만", chgClass: "acbDn", chgText: "▼ 1.2%" },
    { name: "개포주공아파트", sub: "강남구 개포동 · 18평형 · 1982년 건축", price: "12억", priceSub: "6,667만원/평", area: "18평", year: "1982년", official: "9억 8천만", chgClass: "acbDn", chgText: "▼ 2.8%" },
  ];

  const apt = APTS[activeApt];

  return (
    <div className={s.pageShell}>
      {/* DEMO BAR */}
      <div className={s.demoBar}>
        <span className={s.demoLabel}>Demo</span>
        <button className={`${s.demoBtn} ${demoView === "map" ? s.on : ""}`} onClick={() => setView("map")}>① 지도 기본</button>
        <button className={`${s.demoBtn} ${demoView === "apt" ? s.on : ""}`} onClick={() => setView("apt")}>② 아파트 선택</button>
        <button className={`${s.demoBtn} ${demoView === "risk" ? s.on : ""}`} onClick={() => setView("risk")}>③ 위험도분석</button>
        <button className={`${s.demoBtn} ${demoView === "forecast" ? s.on : ""}`} onClick={() => setView("forecast")}>④ 시세전망</button>
      </div>

      {/* NAV */}
      <nav>
        <div className={s.navInner}>
          <a href="#" className={s.navLogo}>
            <div className={s.logoIcon}>V</div>
            <span className={s.logoText}>VESTRA</span>
          </a>
          <ul className={s.navMenu}>
            <li><Link href="/renewal/listings-list">매물검색</Link></li>
            <li><Link href="/renewal/jeonse">전세보호</Link></li>
            <li><Link href="/renewal/rights">권리분석</Link></li>
            <li><Link href="/renewal/monitoring">등기감시</Link></li>
            <li><Link href="/renewal/contract">계약검토</Link></li>
            <li><a href="/renewal/price-map" className="active">시세지도</a></li>
            <li><Link href="/expert-connect">전문가상담</Link></li>
          </ul>
          <div className={s.navAuth}>
            <a href="#">홍길동</a><span className={s.div}>|</span>
            <a href="#">마이페이지</a><span className={s.div}>|</span>
            <a href="#">로그아웃</a>
          </div>
        </div>
      </nav>

      {/* MAP SHELL */}
      <div className={s.mapShell}>
        {/* LEFT PANEL */}
        <div className={s.leftPanel}>
          <div className={s.lpHeader}>
            <div className={s.lpTitle}>시세지도</div>
            <div className={s.tradeToggle}>
              <button
                className={`${s.ttBtn} ${tradeMode === "buy" ? s.on : ""}`}
                onClick={() => setTradeMode("buy")}
              >매매</button>
              <button
                className={`${s.ttBtn} ${tradeMode === "jeonse" ? s.on : ""}`}
                onClick={() => setTradeMode("jeonse")}
              >전세</button>
            </div>
            <div className={s.regionRow}>
              <select className={s.lpSelect}>
                <option>서울특별시</option>
                <option>경기도</option>
              </select>
              <select className={s.lpSelect}>
                <option>강남구</option>
                <option>서초구</option>
                <option>송파구</option>
              </select>
            </div>
          </div>
          <div className={s.lpFilters}>
            <button className={`${s.lpChip} ${chips.apt ? s.on : ""}`} onClick={() => setChips(c => ({ ...c, apt: !c.apt }))}>아파트</button>
            <button className={`${s.lpChip} ${chips.villa ? s.on : ""}`} onClick={() => setChips(c => ({ ...c, villa: !c.villa }))}>빌라</button>
            <button className={`${s.lpChip} ${chips.p30 ? s.on : ""}`} onClick={() => setChips(c => ({ ...c, p30: !c.p30 }))}>30평대</button>
            <button className={`${s.lpChip} ${chips.p40 ? s.on : ""}`} onClick={() => setChips(c => ({ ...c, p40: !c.p40 }))}>40평대</button>
          </div>
          <div className={s.lpListHead}>
            <span className={s.lpListTitle}>상승 TOP</span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,.3)" }}>변동률 순</span>
          </div>
          <div className={s.lpList}>
            <div className={`${s.lpItem} ${activeApt === 0 && aptOpen ? s.on : ""}`} onClick={() => openApt(0)}>
              <span className={s.lpRank}>1</span>
              <div className={s.lpItemInfo}>
                <div className={s.lpAptName}>래미안대치팰리스</div>
                <div className={s.lpAptSub}>강남구 대치동 · 45평</div>
              </div>
              <div><div className={s.lpAptPrice}>28억</div><div className={`${s.lpChg} ${s.lpChgUp}`}>▲ 5.2%</div></div>
            </div>
            <div className={`${s.lpItem} ${activeApt === 1 && aptOpen ? s.on : ""}`} onClick={() => openApt(1)}>
              <span className={s.lpRank}>2</span>
              <div className={s.lpItemInfo}>
                <div className={s.lpAptName}>은마아파트</div>
                <div className={s.lpAptSub}>강남구 대치동 · 32평</div>
              </div>
              <div><div className={s.lpAptPrice}>14억</div><div className={`${s.lpChg} ${s.lpChgUp}`}>▲ 3.8%</div></div>
            </div>
            <div className={`${s.lpItem} ${activeApt === 2 && aptOpen ? s.on : ""}`} onClick={() => openApt(2)}>
              <span className={s.lpRank}>3</span>
              <div className={s.lpItemInfo}>
                <div className={s.lpAptName}>대치아이파크</div>
                <div className={s.lpAptSub}>강남구 대치동 · 38평</div>
              </div>
              <div><div className={s.lpAptPrice}>22억</div><div className={`${s.lpChg} ${s.lpChgUp}`}>▲ 2.1%</div></div>
            </div>
            <div className={s.lpDivider}></div>
            <div className={s.lpSectionLabel}>하락 TOP</div>
            <div className={`${s.lpItem} ${activeApt === 3 && aptOpen ? s.on : ""}`} onClick={() => openApt(3)}>
              <span className={s.lpRank}>1</span>
              <div className={s.lpItemInfo}>
                <div className={s.lpAptName}>도곡렉슬</div>
                <div className={s.lpAptSub}>강남구 도곡동 · 25평</div>
              </div>
              <div><div className={s.lpAptPrice}>18억</div><div className={`${s.lpChg} ${s.lpChgDn}`}>▼ 1.2%</div></div>
            </div>
            <div className={`${s.lpItem} ${activeApt === 4 && aptOpen ? s.on : ""}`} onClick={() => openApt(4)}>
              <span className={s.lpRank}>2</span>
              <div className={s.lpItemInfo}>
                <div className={s.lpAptName}>개포주공아파트</div>
                <div className={s.lpAptSub}>강남구 개포동 · 18평</div>
              </div>
              <div><div className={s.lpAptPrice}>12억</div><div className={`${s.lpChg} ${s.lpChgDn}`}>▼ 2.8%</div></div>
            </div>
          </div>
        </div>

        {/* MAP CENTER */}
        <div className={s.mapCenter}>
          <div className={s.mapPlaceholder}>
            <div className={s.mapPlaceholderInner}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2e4bd8" opacity="0.5" />
              </svg>
              <span style={{ color: "#888", fontSize: "14px", marginTop: "8px" }}>지도 영역</span>
            </div>
          </div>
          <div className={s.mapLegend}>
            <div className={s.mlTitle}>평형별</div>
            <div className={s.mlItems}>
              <div className={s.mlItem}><div className={s.mlDot} style={{ background: "#1e3a5f" }}></div>40평 이상</div>
              <div className={s.mlItem}><div className={s.mlDot} style={{ background: "#3b82f6" }}></div>30평대</div>
              <div className={s.mlItem}><div className={s.mlDot} style={{ background: "#60a5fa" }}></div>20평대</div>
              <div className={s.mlItem}><div className={s.mlDot} style={{ background: "#93c5fd" }}></div>10평대</div>
            </div>
          </div>
          <div className={s.mapControls}>
            <button className={s.mapCtrlBtn}>+</button>
            <button className={s.mapCtrlBtn}>−</button>
          </div>
        </div>

        {/* APT SLIDE PANEL */}
        <div className={`${s.aptPanel} ${aptOpen ? s.open : ""}`}>
          <div className={s.aptRoadview}>
            <div className={s.aptRoadviewBg}></div>
            <div className={s.aptRoadviewLabel}>도로뷰</div>
            <button className={s.aptCloseBtn} onClick={closeApt}>✕</button>
          </div>
          <div className={s.aptHead}>
            <div className={s.aptNameRow}>
              <div className={s.aptName}>{apt.name}</div>
              <span className={`${s.aptChgBadge} ${s[apt.chgClass as keyof typeof s]}`}>{apt.chgText}</span>
            </div>
            <div className={s.aptSub}>{apt.sub}</div>
          </div>
          <div className={s.aptInfoGrid}>
            <div className={s.aptInfoTile}>
              <div className={s.aitLabel}>매매 시세</div>
              <div className={s.aitVal}>{apt.price}</div>
              <div className={s.aitSub}>{apt.priceSub}</div>
            </div>
            <div className={s.aptInfoTile}>
              <div className={s.aitLabel}>면적</div>
              <div className={s.aitVal}>{apt.area}</div>
              <div className={s.aitSub}>전용면적</div>
            </div>
            <div className={s.aptInfoTile}>
              <div className={s.aitLabel}>건축년도</div>
              <div className={s.aitVal}>{apt.year}</div>
              <div className={s.aitSub}>건축연차</div>
            </div>
            <div className={s.aptInfoTile}>
              <div className={s.aitLabel}>공시가격</div>
              <div className={s.aitVal}>{apt.official}</div>
              <div className={s.aitSub}>공시가율</div>
            </div>
          </div>
          <div className={s.aptBtns}>
            <button className={s.aptRiskBtn} onClick={openRisk}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              위험도 분석
            </button>
            <button className={s.aptForecastBtn} onClick={openForecast}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
              시세전망
            </button>
          </div>
        </div>
      </div>

      {/* RISK POPUP */}
      <div
        className={`${s.popupOverlay} ${riskOpen ? s.open : ""}`}
        onClick={(e) => { if (e.target === e.currentTarget) closeRisk(); }}
      >
        <div className={s.riskPopup}>
          <div className={s.rpHeader}>
            <button className={s.rpClose} onClick={closeRisk}>✕</button>
            <div className={s.rpAptName}>래미안대치팰리스 · 45평형</div>
            <div className={s.rpScoreRow}>
              <div className={s.rpGauge}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="6" />
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#f59e0b" strokeWidth="6" strokeDasharray="163.36" strokeDashoffset="40.84" strokeLinecap="round" />
                </svg>
                <div className={s.rpGaugeNum}>
                  <span className={s.rpGaugeN}>75</span>
                  <span className={s.rpGaugeL}>점</span>
                </div>
              </div>
              <div>
                <div className={s.rpGrade}>보통</div>
                <div className={s.rpGradeSub}>일부 지표 확인 권장<br />전세가율에 주의 필요</div>
              </div>
            </div>
          </div>
          <div className={s.rpBody}>
            <div className={s.riskItem}><span className={s.riLabel}>시세 변동</span><span className={s.riVal}>+5.2% (3개월)</span><span className={`${s.riLevel} ${s.rilSafe}`}>안전</span></div>
            <div className={s.riskItem}><span className={s.riLabel}>건물 연식</span><span className={s.riVal}>11년 (2015년)</span><span className={`${s.riLevel} ${s.rilSafe}`}>안전</span></div>
            <div className={s.riskItem}><span className={s.riLabel}>평당 시세</span><span className={s.riVal}>6,222만원/평</span><span className={`${s.riLevel} ${s.rilSafe}`}>안전</span></div>
            <div className={s.riskItem}><span className={s.riLabel}>면적 구성</span><span className={s.riVal}>45평 (중대형)</span><span className={`${s.riLevel} ${s.rilSafe}`}>안전</span></div>
            <div className={s.riskItem}><span className={s.riLabel}>전세가율</span><span className={s.riVal}>52% (14억 6천)</span><span className={`${s.riLevel} ${s.rilCaution}`}>주의</span></div>
          </div>
          <div className={s.rpNote}>본 위험도 분석은 시세·연식·전세가율 등 공개 지표 기반의 참고 정보입니다. 투자 판단 근거로 사용하지 마세요.</div>
        </div>
      </div>

      {/* FORECAST OVERLAY */}
      <div
        className={`${s.forecastOverlay} ${forecastOpen ? s.open : ""}`}
        onClick={(e) => { if (e.target === e.currentTarget) closeForecast(); }}
      >
        <div className={s.forecastPanel}>
          <div className={s.fpHeader}>
            <div className={s.fpTopRow}>
              <span className={s.fpEyebrow}>Price Forecast</span>
              <button className={s.fpClose} onClick={closeForecast}>✕</button>
            </div>
            <div className={s.fpAptName}>래미안대치팰리스</div>
            <div className={s.fpAptSub}>강남구 대치동 · 45평형 · 매매</div>
            <div className={s.fpTabs}>
              <button className={`${s.fpTab} ${fpTab === "dashboard" ? s.on : ""}`} onClick={() => setFpTab("dashboard")}>대시보드</button>
              <button className={`${s.fpTab} ${fpTab === "chart" ? s.on : ""}`} onClick={() => setFpTab("chart")}>차트</button>
              <button className={`${s.fpTab} ${fpTab === "compare" ? s.on : ""}`} onClick={() => setFpTab("compare")}>지역비교</button>
              <button className={`${s.fpTab} ${fpTab === "backtest" ? s.on : ""}`} onClick={() => setFpTab("backtest")}>백테스트</button>
              <button className={`${s.fpTab} ${fpTab === "anomaly" ? s.on : ""}`} onClick={() => setFpTab("anomaly")}>이상탐지</button>
            </div>
          </div>
          <PriceMapRenewalContent fpTab={fpTab} />
        </div>
      </div>
    </div>
  );
}
