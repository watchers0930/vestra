"use client";

import { ShieldCheck, Search, Zap, Lock } from "lucide-react";
import s from "../monitoring-renewal.module.css";
import MonitoringKpiRow from "./MonitoringKpiRow";

interface Props {
  onAdd: () => void;
}

/**
 * 등기감시 빈 상태 (로그인 사용자 · 물건 0건) — 첫 물건 등록 유도.
 * 로그인 유도는 상위 RenewalAuthGate가 담당한다.
 */
export default function MonitoringEmptyView({ onAdd }: Props) {
  return (
    <>
      <MonitoringKpiRow empty activeCount={0} totalCount={0} unreadAlertCount={0} highRiskCount={0} />

      <div className={s.emptyWrap}>
        <div className={s.emptyIconBox}>
          <ShieldCheck size={32} />
        </div>
        <div className={s.emptyTitle}>아직 감시 중인 물건이 없습니다</div>
        <div className={s.emptyDesc}>
          주소를 등록하면 VESTRA AI가 하루 2회 등기부를 점검하고<br />
          소유권 변동, 압류, 근저당 설정 등 위험 이벤트를 즉시 알려드립니다.
        </div>

        <button className={s.emptyCta} onClick={onAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          첫 물건 등록하기
        </button>

        <div className={s.whyGrid}>
          <div className={s.whyCard}>
            <div className={s.whyIco}><Search size={22} /></div>
            <div className={s.whyT}>하루 2회 자동 감시</div>
            <div className={s.whyD}>신청사건 프리체크로 이상징후를 조기 감지하고, 실제 변동 발생 시 확정조회로 즉시 전환합니다.</div>
          </div>
          <div className={s.whyCard}>
            <div className={s.whyIco}><Zap size={22} /></div>
            <div className={s.whyT}>위험 즉시 알림</div>
            <div className={s.whyD}>압류, 근저당 설정, 소유권 변동 등 위험 유형을 위험도별로 분류하여 즉시 통보합니다.</div>
          </div>
          <div className={s.whyCard}>
            <div className={s.whyIco}><Lock size={22} /></div>
            <div className={s.whyT}>블록체인 무결성 보호</div>
            <div className={s.whyD}>등기부 기록을 블록체인 방식으로 암호화 저장하여 위변조를 원천 차단하고 법적 증명서를 발급합니다.</div>
          </div>
        </div>
      </div>
    </>
  );
}
