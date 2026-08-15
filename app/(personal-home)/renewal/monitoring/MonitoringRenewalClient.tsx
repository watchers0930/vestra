"use client";

import { useState, useCallback } from "react";
import s from "./monitoring-renewal.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import RenewalAuthGate from "../_shared/RenewalAuthGate";
import { useMonitoringData } from "@/app/(app)/monitoring/hooks/useMonitoringData";
import MonitoringEmptyView from "./components/MonitoringEmptyView";
import MonitoringListView from "./components/MonitoringListView";
import MonitoringDetailView from "./components/MonitoringDetailView";
import AddPropertyModalRenewal from "./components/AddPropertyModalRenewal";

export default function MonitoringRenewalClient() {
  return (
    <RenewalAuthGate active="monitoring">
      <MonitoringInner />
    </RenewalAuthGate>
  );
}

function MonitoringInner() {
  const {
    properties,
    filteredProperties,
    loading,
    mounted,
    statusFilter,
    setStatusFilter,
    activeCount,
    unreadAlertCount,
    highRiskCount,
    unreadByProperty,
    highestRiskByProperty,
    refresh,
  } = useMonitoringData();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const scrollTop = () => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    scrollTop();
  }, []);

  const handleBack = useCallback(() => {
    setSelectedId(null);
    scrollTop();
    refresh();
  }, [refresh]);

  const handleAdd = useCallback(() => {
    setShowAddModal(true);
  }, []);

  // ── 상세 뷰 ──
  if (selectedId) {
    return (
      <>
        <RenewalGnb active="monitoring" />
        <MonitoringDetailView propertyId={selectedId} onBack={handleBack} />
        <RenewalFooter />
      </>
    );
  }

  // ── 목록 / 빈 상태 ──
  const isEmpty = mounted && !loading && properties.length === 0;

  return (
    <>
      <RenewalGnb active="monitoring" />

      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>Registry Monitor</span>
          <h1>등기감시</h1>
          <p className={s.subHeroSub}>등기부 변동을 실시간 감시하고, 블록체인으로 기록을 보호합니다</p>
        </div>
      </section>

      <div className={s.pageWrap}>
        <div className={s.topbar}>
          <div className={s.topbarTitle}>나의 등기감시</div>
          <button className={s.addBtn} onClick={handleAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            물건 추가
          </button>
        </div>

        {!mounted || loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#999", fontSize: "14px" }}>
            불러오는 중...
          </div>
        ) : isEmpty ? (
          <MonitoringEmptyView onAdd={handleAdd} />
        ) : (
          <MonitoringListView
            properties={properties}
            filteredProperties={filteredProperties}
            statusFilter={statusFilter}
            onFilterChange={setStatusFilter}
            activeCount={activeCount}
            unreadAlertCount={unreadAlertCount}
            highRiskCount={highRiskCount}
            unreadByProperty={unreadByProperty}
            highestRiskByProperty={highestRiskByProperty}
            onSelect={handleSelect}
          />
        )}
      </div>

      {showAddModal && (
        <AddPropertyModalRenewal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            refresh();
          }}
        />
      )}

      <RenewalFooter />
    </>
  );
}

function RenewalFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.footerIn}>
        <div>
          <div className={s.flogo}><div className={s.flogoI}>V</div><span className={s.flogoT}>VESTRA</span></div>
          <p className={s.ftag}>The Digital Curator of Real Estate<br />AI 기반 부동산 자산관리 플랫폼</p>
          <div className={s.fcontact}>BMI C&S | 대표이사 김동의<br />사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189<br />서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호<br />고객센터 010-8490-9271</div>
        </div>
        <div><p className={s.fcolT}>Legal</p><ul className={s.flinks}><li><a href="#">개인정보처리방침</a></li><li><a href="#">이용약관</a></li></ul></div>
        <div><p className={s.fcolT}>Product</p><ul className={s.flinks}><li><a href="#">기능 소개</a></li><li><a href="#">요금제</a></li></ul></div>
        <div><p className={s.fcolT}>Company</p><ul className={s.flinks}><li><a href="#">회사 소개</a></li><li><a href="#">채용</a></li></ul></div>
        <div><p className={s.fcolT}>Connect</p><ul className={s.flinks}><li><a href="#">LinkedIn</a></li></ul></div>
      </div>
      <div className={s.fbot}><span>© 2026 BMI-C&S All rights reserved.</span><span>The Digital Curator of Real Estate</span></div>
    </footer>
  );
}
