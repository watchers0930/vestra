"use client";

import { Bell } from "lucide-react";
import s from "../monitoring-renewal.module.css";
import type { MonitoredProperty } from "@/app/(app)/monitoring/hooks/useMonitoringData";

interface Props {
  property: MonitoredProperty;
  unreadCount: number;
  highestRisk?: string;
  onSelect: (id: string) => void;
}

const MODE_LABEL: Record<string, string> = {
  standard: "일반 감시",
  contract_gap: "계약갭 강화감시",
};

const RISK_LABEL: Record<string, string> = {
  critical: "위험",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

/** 미확인 알림 최고 위험도 → 시안 배지 클래스 */
const RISK_BADGE_CLASS: Record<string, string> = {
  critical: "rbCritical",
  high: "rbHigh",
  medium: "rbMedium",
  low: "rbLow",
};

/** 신청사건 감시 상태 → 시안 배지 클래스 */
const SIGNAL_BADGE_CLASS: Record<string, string> = {
  idle: "pbIdle",
  case_detected: "pbDetected",
  pending_confirm: "pbConfirm",
  confirmed_changed: "pbChanged",
  confirmed_no_change: "pbNochange",
  dismissed: "pbDismissed",
};

/** 신청사건 진행 단계 → 시안 배지 클래스 */
const PHASE_BADGE_CLASS: Record<string, string> = {
  "접수": "pb접수",
  "처리 중": "pb처리중",
  "처리 완료": "pb처리완료",
  "종결": "pb종결",
};

function signalLabel(status?: string | null): string {
  switch (status) {
    case "case_detected":
      return "신청사건 감지";
    case "pending_confirm":
      return "확정조회 대기";
    case "confirmed_changed":
      return "변경 확인";
    case "confirmed_no_change":
      return "변경 없음";
    case "dismissed":
      return "종결 확인";
    default:
      return "프리체크 대기";
  }
}

/** 신청사건 진행 단계 배지 (접수/처리중/처리완료/종결) */
function signalPhase(property: MonitoredProperty): string | null {
  const status = property.registrySignalStatus || "idle";
  const summary = property.registrySignalSummary || "";
  if (status === "pending_confirm" || summary.includes("처리 완료")) return "처리 완료";
  if (summary.includes("처리 중")) return "처리 중";
  if (status === "case_detected" || summary.includes("접수")) return "접수";
  if (status === "dismissed") return "종결";
  return null;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "점검 대기";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

/** 보증금(만원 단위) → "3억원" / "2억 5,000만원" */
function formatDeposit(man: number | null): string | null {
  if (!man) return null;
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  if (eok > 0) return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

export default function MonitoringPropertyCard({ property, unreadCount, highestRisk, onSelect }: Props) {
  const isActive = property.status === "active";
  const signalStatus = property.registrySignalStatus || "idle";
  const phase = signalPhase(property);
  const isCompletedSignal =
    signalStatus === "pending_confirm" ||
    signalStatus === "confirmed_changed" ||
    (property.registrySignalSummary || "").includes("처리 완료");
  const showIssueCta = isActive && !!property.commUniqueNo && !!property.ownerName && isCompletedSignal;
  const depositLabel = formatDeposit(property.deposit);

  return (
    <div className={s.propCard} onClick={() => onSelect(property.id)}>
      <div className={`${s.propSide} ${isActive ? s.psActive : s.psPaused}`}></div>
      <div className={s.propInner}>
        <div className={s.propHead}>
          <div className={s.propAddrBlock}>
            <div className={s.propAddr}>{property.address}</div>
            {depositLabel && <div className={s.propDeposit}>보증금 {depositLabel}</div>}
          </div>
          <span className={`${s.propSbadge} ${isActive ? s.psbActive : s.psbPaused}`}>
            {isActive ? "감시중" : "일시중지"}
          </span>
        </div>

        <div className={s.propBadges}>
          <span className={`${s.pb} ${s.pbMode}`}>{MODE_LABEL[property.monitorMode] || property.monitorMode}</span>
          {isActive && <span className={`${s.pb} ${s.pbFreq}`}>하루 2회</span>}
          {isActive && (
            <span className={`${s.pb} ${s[SIGNAL_BADGE_CLASS[signalStatus]] || s.pbIdle}`}>
              {signalLabel(signalStatus)}
            </span>
          )}
          {phase && <span className={`${s.pb} ${s[PHASE_BADGE_CLASS[phase]] || s["pb접수"]}`}>{phase}</span>}
          {!isActive && <span className={`${s.pb} ${s.pbDismissed}`}>감시 대기</span>}
        </div>

        <div className={`${s.engBox} ${isActive ? s.engBoxOn : s.engBoxOff}`}>
          <div className={`${s.engDot} ${isActive ? s.engDotOn : s.engDotOff}`}></div>
          <div>
            {isActive ? (
              isCompletedSignal ? (
                <>
                  <div className={`${s.engBoxT} ${s.engBoxTOn}`}>신청사건 감지 — 확정조회 대기 중</div>
                  <div className={`${s.engBoxS} ${s.engBoxSOn}`}>법원 접수 확인됨 · 처리 완료 시 최신 등기부 자동 발급</div>
                </>
              ) : (
                <>
                  <div className={`${s.engBoxT} ${s.engBoxTOn}`}>등기감시 엔진 작동 중</div>
                  <div className={`${s.engBoxS} ${s.engBoxSOn}`}>프리체크 후 이상징후 발생 시 확정조회 · 점검 주기: 하루 2회</div>
                </>
              )
            ) : (
              <>
                <div className={`${s.engBoxT} ${s.engBoxTOff}`}>감시 일시중지</div>
                <div className={`${s.engBoxS} ${s.engBoxSOff}`}>감시를 재개하려면 물건 상세에서 활성화하세요</div>
              </>
            )}
          </div>
        </div>

        {showIssueCta && <button className={s.propCtaBtn}>최신 등기부 확인하기</button>}

        <div className={s.propFooter}>
          <div className={s.palertRow}>
            {unreadCount > 0 ? (
              <>
                <span><Bell size={16} /></span>
                <span className={s.palertCnt}>미확인 알림 {unreadCount}건</span>
                {highestRisk && (
                  <span className={`${s.riskB} ${s[RISK_BADGE_CLASS[highestRisk]] || ""}`}>
                    {RISK_LABEL[highestRisk] || highestRisk}
                  </span>
                )}
              </>
            ) : (
              <span className={`${s.palertCnt} ${s.palertZero}`}>알림 없음</span>
            )}
          </div>
          <div className={s.ptime}>{formatRelativeTime(property.lastCheckedAt)}<span className={s.parrow}>›</span></div>
        </div>
      </div>
    </div>
  );
}
