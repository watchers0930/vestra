"use client";

/**
 * renewal 가입 상태 패널 기본틀(설계 renewal.design §1.2 TR-01).
 * 로딩·오류·접수·대기·반려·완료 패널이 공유하는 카드/배너/액션 틀. 톤별 색은 signup-theme 토큰만 사용한다.
 * pending 등은 색상 외에 아이콘·문구로도 구분한다(§8.2 접근성).
 */

import type { ReactNode } from "react";
import { SIGNUP_THEME } from "../signup-theme";

export type StatusTone = "neutral" | "success" | "warning" | "danger";

const TONE: Record<StatusTone, { bg: string; fg: string }> = {
  neutral: { bg: "#f5f5f7", fg: SIGNUP_THEME.body },
  success: { bg: SIGNUP_THEME.successBg, fg: SIGNUP_THEME.successText },
  warning: { bg: SIGNUP_THEME.warningBg, fg: SIGNUP_THEME.warningText },
  danger: { bg: SIGNUP_THEME.dangerBg, fg: SIGNUP_THEME.dangerText },
};

interface RenewalStatusPanelProps {
  /** 제목(h1). */
  title: string;
  /** 배너 톤(상태 색). */
  tone?: StatusTone;
  /** 상태 배너 안의 아이콘(색상 외 구분 수단). */
  icon?: ReactNode;
  /** 배너 본문 — 현재 상태 설명. */
  banner?: ReactNode;
  /** 배너 아래 보조 설명. */
  description?: ReactNode;
  /** CTA/액션 버튼 영역. */
  actions?: ReactNode;
}

export function RenewalStatusPanel({
  title,
  tone = "neutral",
  icon,
  banner,
  description,
  actions,
}: RenewalStatusPanelProps) {
  const t = TONE[tone];
  return (
    <div
      style={{
        borderRadius: SIGNUP_THEME.radius,
        border: `1px solid ${SIGNUP_THEME.border}`,
        background: SIGNUP_THEME.card,
        padding: 28,
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 700, color: SIGNUP_THEME.text, margin: 0 }}>{title}</h1>

      {banner && (
        <div
          role="status"
          style={{
            marginTop: 18,
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 14,
            background: t.bg,
            color: t.fg,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          {icon && <span style={{ flexShrink: 0, display: "inline-flex" }}>{icon}</span>}
          <span>{banner}</span>
        </div>
      )}

      {description && (
        <p style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6, color: SIGNUP_THEME.faint }}>
          {description}
        </p>
      )}

      {actions && <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>{actions}</div>}
    </div>
  );
}
