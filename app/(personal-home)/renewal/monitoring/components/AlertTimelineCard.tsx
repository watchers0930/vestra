"use client";

import { Bell, Sparkles } from "lucide-react";
import s from "../monitoring-renewal.module.css";
import type { AlertItem } from "@/app/(app)/monitoring/[id]/hooks/usePropertyDetail";
import {
  CHANGE_TYPE_LABEL,
  RISK_LABEL,
  RISK_ICO_SUFFIX,
  RISK_BADGE_SUFFIX,
  changeTypeIcon,
  getRiskExplanation,
  formatRelativeTime,
} from "./alertHelpers";

interface Props {
  alerts: AlertItem[];
  unreadCount: number;
  deposit: number | null;
  onMarkRead: (alertId: string) => void;
}

export default function AlertTimelineCard({ alerts, unreadCount, deposit, onMarkRead }: Props) {
  return (
    <div className={s.detCard}>
      <div className={s.detEyebrow}>Alert Timeline</div>
      <div className={s.detTitle}>변동 알림</div>
      <div className={s.detSub}>감시 기간 중 감지된 등기 변동 이력</div>
      {alerts.length > 0 ? (
        <>
          <div className={`${s.detCountBadge} ${unreadCount > 0 ? s.dcbAmber : s.dcbGreen}`}>
            <Bell size={13} /> 총 {alerts.length}건의 변동 감지
          </div>
          {alerts.map((alert) => {
            const Icon = changeTypeIcon(alert.changeType);
            const explanation = getRiskExplanation(alert.changeType, alert.riskLevel, alert.summary, deposit);
            const hasBody = !!explanation || !!alert.detail || !alert.isRead;
            return (
              <div className={s.alertItem} key={alert.id}>
                <div className={s.aiHead}>
                  <div className={`${s.aiIco} ${s[RISK_ICO_SUFFIX[alert.riskLevel]] || s.aiIcoMedium}`}>
                    <Icon size={15} />
                  </div>
                  <div className={s.aiInfo}>
                    <div className={s.aiType}>{CHANGE_TYPE_LABEL[alert.changeType] || alert.changeType}</div>
                    <div className={s.aiSumm}>{alert.summary}</div>
                  </div>
                  <div className={s.aiMeta}>
                    <span className={`${s.aiRisk} ${s[RISK_BADGE_SUFFIX[alert.riskLevel]] || s.airMedium}`}>
                      {RISK_LABEL[alert.riskLevel] || alert.riskLevel}
                    </span>
                    <span className={s.aiTime}>{formatRelativeTime(alert.createdAt)}</span>
                  </div>
                  {!alert.isRead && <div className={s.aiUnread}></div>}
                </div>
                {hasBody && (
                  <div className={s.aiBody}>
                    {alert.detail && <div className={s.aiDetail}>{alert.detail}</div>}
                    {explanation && (
                      <div className={s.aiWhy}>
                        <span className={s.aiWhyIco}><Sparkles size={13} /></span>
                        <div className={s.aiWhyTxt}>{explanation}</div>
                      </div>
                    )}
                    {!alert.isRead && (
                      <div className={s.aiBtns}>
                        <button className={s.aiRead} onClick={() => onMarkRead(alert.id)}>읽음 처리</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#999", fontSize: "13px" }}>
          감지된 변동 사항이 없습니다.
        </div>
      )}
    </div>
  );
}
