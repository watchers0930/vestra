"use client";

/**
 * 개인(PERSONAL) 세부유형 선택(설계 renewal.design §2.4·§5.2). 임차/매수(TENANT) · 임대/매도(LANDLORD).
 * 승인 없이 저장 후 플랜 선택으로 진행한다. 구 톤(text-muted/primary)을 renewal 공통 토큰으로 교체하고,
 * 외곽 레이아웃은 공통 셸이 담당하므로 여기서는 본문 카드만 렌더한다.
 */

import { useState } from "react";
import { Home, Building2, Check } from "lucide-react";
import { SIGNUP_THEME } from "@/app/(personal-home)/renewal/_shared/signup-theme";

interface Props {
  onSelect: (userType: "TENANT" | "LANDLORD") => void;
}

const OPTIONS: Array<{ type: "TENANT" | "LANDLORD"; icon: typeof Home; title: string; desc: string }> = [
  { type: "TENANT", icon: Home, title: "임차인 · 매수인", desc: "전세/매매 물건을 분석하고 안전하게 거래합니다" },
  { type: "LANDLORD", icon: Building2, title: "임대인 · 매도인", desc: "보유 물건을 등록하고 안심인증으로 신뢰를 높입니다" },
];

export default function UserTypeSelector({ onSelect }: Props) {
  const [hovered, setHovered] = useState<"TENANT" | "LANDLORD" | null>(null);

  return (
    <div
      style={{
        borderRadius: SIGNUP_THEME.radius,
        border: `1px solid ${SIGNUP_THEME.border}`,
        background: SIGNUP_THEME.card,
        padding: 28,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: SIGNUP_THEME.text, margin: 0 }}>
          어떤 목적으로 사용하시나요?
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: SIGNUP_THEME.muted }}>
          목적에 맞는 메뉴와 기능을 제공해 드립니다
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {OPTIONS.map(({ type, icon: Icon, title, desc }) => {
          const on = hovered === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              onMouseEnter={() => setHovered(type)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(type)}
              onBlur={() => setHovered(null)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                padding: "28px 16px",
                borderRadius: 16,
                border: `1.5px solid ${on ? SIGNUP_THEME.accent : SIGNUP_THEME.border}`,
                background: on ? "rgba(0,113,227,0.05)" : SIGNUP_THEME.card,
                cursor: "pointer",
                transition: "border-color 0.15s, background-color 0.15s",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: "rgba(0,113,227,0.1)",
                }}
              >
                <Icon size={26} strokeWidth={1.6} style={{ color: SIGNUP_THEME.accent }} aria-hidden />
              </span>
              <span>
                <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: SIGNUP_THEME.text }}>{title}</span>
                <span style={{ display: "block", marginTop: 4, fontSize: 12, lineHeight: 1.5, color: SIGNUP_THEME.muted }}>
                  {desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          marginTop: 20,
          fontSize: 12,
          color: SIGNUP_THEME.faint,
        }}
      >
        <Check size={13} aria-hidden />
        마이페이지에서 언제든 변경할 수 있습니다
      </p>
    </div>
  );
}
