"use client";

import s from "../monitoring-renewal.module.css";

interface Props {
  /** 빈 상태(감시 물건 0건 또는 비로그인)면 회색 대시 표기 */
  empty?: boolean;
  activeCount: number;
  totalCount: number;
  unreadAlertCount: number;
  highRiskCount: number;
}

/**
 * 등기감시 KPI 4카드 — 빈 상태(empty)와 목록 상태 공용.
 * empty=true: 감시중 0, 나머지 회색 대시.
 */
export default function MonitoringKpiRow({
  empty,
  activeCount,
  totalCount,
  unreadAlertCount,
  highRiskCount,
}: Props) {
  if (empty) {
    return (
      <div className={s.kpiRow}>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>감시 중</div>
          <div className={`${s.kpiVal} ${s.kpiCGray}`}>0</div>
          <div className={s.kpiSub}>등록된 감시 물건이 없습니다</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>미확인 알림</div>
          <div className={`${s.kpiVal} ${s.kpiCGray}`}>—</div>
          <div className={s.kpiSub}>변동 알림이 없습니다</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>고위험 알림</div>
          <div className={`${s.kpiVal} ${s.kpiCGray}`}>—</div>
          <div className={s.kpiSub}>즉시 확인 필요 알림 없음</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>기록 보호</div>
          <div className={`${s.kpiVal} ${s.kpiCGray}`}>—</div>
          <div className={s.kpiSub}>블록체인 암호화 보호</div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.kpiRow}>
      <div className={s.kpiCard}>
        <div className={s.kpiLabel}>감시 중</div>
        <div className={`${s.kpiVal} ${s.kpiCBlue}`}>{activeCount}</div>
        <div className={s.kpiSub}>전체 {totalCount}건 중 활성 감시</div>
      </div>
      <div className={s.kpiCard}>
        <div className={s.kpiLabel}>미확인 알림</div>
        <div className={`${s.kpiVal} ${unreadAlertCount > 0 ? s.kpiCAmber : s.kpiCGray}`}>
          {unreadAlertCount}
        </div>
        <div className={s.kpiSub}>확인하지 않은 변동 알림</div>
      </div>
      <div className={s.kpiCard}>
        <div className={s.kpiLabel}>고위험 알림</div>
        <div className={`${s.kpiVal} ${highRiskCount > 0 ? s.kpiCRed : s.kpiCGray}`}>
          {highRiskCount}
        </div>
        <div className={s.kpiSub}>즉시 확인이 필요한 알림</div>
      </div>
      <div className={s.kpiCard}>
        <div className={s.kpiLabel}>기록 보호</div>
        <div className={`${s.kpiVal} ${s.kpiCGreen}`}>{totalCount}</div>
        <div className={s.kpiSub}>모든 기록 암호화 보호 중</div>
      </div>
    </div>
  );
}
