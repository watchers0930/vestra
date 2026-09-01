"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import s from "./tax.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import {
  calculateAcquisitionTax,
  calculateHoldingTax,
  calculateTransferTax,
} from "@/lib/tax-calculator";
import { formatManwon } from "./components/taxFormat";
import AcquisitionPanel from "./components/AcquisitionPanel";
import HoldingPanel from "./components/HoldingPanel";
import TransferPanel from "./components/TransferPanel";
import ScenarioPanel from "./components/ScenarioPanel";

type TaxTab = "acq" | "hold" | "trans" | "scn";

const TAB_ACTIVE: Record<TaxTab, string> = {
  acq: s.activeAcq,
  hold: s.activeHold,
  trans: s.activeTrans,
  scn: s.activeScn,
};

export default function TaxClient() {
  const [activeTab, setActiveTab] = useState<TaxTab>("acq");

  // 취득세 매매가 / 양도세 취득·양도가 — 비교카드·시나리오와 공유
  const [acqPrice, setAcqPrice] = useState(850000000);
  const [transAcqPrice, setTransAcqPrice] = useState(600000000);
  const [transTransPrice] = useState(900000000);

  // 상단 비교 카드용 실시간 계산 (기본 가정: 1주택)
  const compare = useMemo(() => {
    const acq = calculateAcquisitionTax({ price: acqPrice, houseCount: 1, isAdjusted: false, isFirstHome: false });
    const hold = calculateHoldingTax({ assessedValue: 600000000, houseCount: 1, isAdjusted: false });
    const trans = calculateTransferTax({
      acquisitionPrice: transAcqPrice,
      transferPrice: transTransPrice,
      holdingYears: 5,
      livingYears: 3,
      houseCount: 1,
      isAdjusted: false,
    });
    const acqTotal = acq.totalTax ?? acq.tax;
    const holdTotal = hold.totalTax;
    const transTotal = trans.totalTax ?? trans.tax ?? 0;
    const max = Math.max(acqTotal, holdTotal, transTotal, 1);
    return {
      acqTotal, holdTotal, transTotal,
      acqPct: Math.max((acqTotal / max) * 100, 6),
      holdPct: Math.max((holdTotal / max) * 100, 6),
      transPct: Math.max((transTotal / max) * 100, 6),
    };
  }, [acqPrice, transAcqPrice, transTransPrice]);

  const tabs: { id: TaxTab; label: string; icon: React.ReactNode }[] = [
    { id: "acq", label: "취득세", icon: <svg viewBox="0 0 24 24"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" /></svg> },
    { id: "hold", label: "보유세", icon: <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
    { id: "trans", label: "양도세", icon: <svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg> },
    { id: "scn", label: "시나리오 비교", icon: <svg viewBox="0 0 24 24"><path d="M8 3v18M3 8h5M16 21V3M21 16h-5" /></svg> },
  ];

  return (
    <div className={s.pageShell}>
      {/* NAV */}
      <RenewalGnb active="tax" />

      {/* SUB HERO */}
      <section className={s.subHero}>
        <div className={s.subHeroBg} />
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>Tax Simulation</span>
          <h1>세금계산</h1>
          <p className={s.subHeroSub}>취득세 · 보유세 · 양도세 시뮬레이션</p>
        </div>
      </section>

      {/* PAGE */}
      <div className={s.pageWrap}>
        <p className={s.secEyebrow}>Tax Calculator</p>
        <h2 className={s.secTitle}>부동산 세금 시뮬레이션</h2>
        <p className={s.secDesc}>
          매매·보유·양도 단계별 예상 세액을 한 번에 확인하세요. 공시가격은 주소만 입력하면 자동으로 적용됩니다.
        </p>

        {/* 세금 한눈에 비교 */}
        <div className={s.compareCard}>
          <div className={s.compareHd}>
            <div className={s.compareTitle}>
              <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              세금 한눈에 비교
            </div>
            <span className={s.compareNote}>매매가 {formatManwon(acqPrice)} · 1주택 기준 예시</span>
          </div>
          <div className={s.barRow}>
            <span className={s.barLabel}>취득세</span>
            <div className={s.barTrack}><div className={s.barFill} style={{ width: `${compare.acqPct}%`, background: "#2e4bd8" }}>취득 단계</div></div>
            <span className={s.barVal}>{formatManwon(compare.acqTotal)}</span>
          </div>
          <div className={s.barRow}>
            <span className={s.barLabel}>보유세 / 연</span>
            <div className={s.barTrack}><div className={s.barFill} style={{ width: `${compare.holdPct}%`, background: "#10b981" }}>연간</div></div>
            <span className={s.barVal}>{formatManwon(compare.holdTotal)}</span>
          </div>
          <div className={s.barRow}>
            <span className={s.barLabel}>양도세</span>
            <div className={s.barTrack}><div className={s.barFill} style={{ width: `${compare.transPct}%`, background: "#f59e0b" }}>양도 단계</div></div>
            <span className={s.barVal}>{formatManwon(compare.transTotal)}</span>
          </div>
        </div>

        {/* 탭 */}
        <div className={s.tabNav} role="tablist" aria-label="세금 유형 선택">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`${s.tabBtn} ${activeTab === tab.id ? TAB_ACTIVE[tab.id] : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 패널 */}
        {activeTab === "acq" && <AcquisitionPanel price={acqPrice} setPrice={setAcqPrice} />}
        {activeTab === "hold" && <HoldingPanel />}
        {activeTab === "trans" && (
          <TransferPanel acqPrice={transAcqPrice} setAcqPrice={setTransAcqPrice} />
        )}
        {activeTab === "scn" && (
          <ScenarioPanel acqPrice={transAcqPrice} transPrice={transTransPrice} />
        )}

        {/* 면책 */}
        <div className={s.disclaimer}>
          <p>
            <strong>면책 조항</strong>
            <br />
            본 세금 계산은 2026년 기준 세법에 따른 참고용 추정치이며, 세무 상담을 대체하지 않습니다. 개인의 보유 현황,
            감면 요건, 지자체 조례 등에 따라 실제 세액과 차이가 있을 수 있습니다. 정확한 세금 산출은 반드시 세무사와
            상담하시기 바랍니다.
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerIn}>
          <div>
            <div className={s.flogo}><Image src="/vestra-symbol.png" alt="VESTRA" width={26} height={26} className={s.flogoI} /><span className={s.flogoT}>VESTRA</span></div>
            <p className={s.ftag}>The Digital Curator of Real Estate<br />AI 기반 부동산 자산관리 플랫폼</p>
            <div className={s.fcontact}>
              BMI C&amp;S | 대표이사 김동의<br />
              사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189<br />
              서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호<br />
              고객센터 010-8490-9271
            </div>
          </div>
          <div><p className={s.fcolT}>Legal</p><ul className={s.flinks}><li><a href="#">개인정보처리방침</a></li><li><a href="#">이용약관</a></li></ul></div>
          <div><p className={s.fcolT}>Product</p><ul className={s.flinks}><li><a href="#">기능 소개</a></li><li><a href="#">요금제</a></li></ul></div>
          <div><p className={s.fcolT}>Company</p><ul className={s.flinks}><li><a href="#">회사 소개</a></li><li><a href="#">채용</a></li><li><a href="#">뉴스레터</a></li></ul></div>
          <div><p className={s.fcolT}>Connect</p><ul className={s.flinks}><li><a href="#">LinkedIn</a></li></ul></div>
        </div>
        <div className={s.fbot}>
          <span>© 2026 BMI-C&amp;S All rights reserved.</span>
          <span>The Digital Curator of Real Estate</span>
        </div>
      </footer>
    </div>
  );
}
