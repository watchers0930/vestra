"use client";

/**
 * renewal 가입 공통 브랜드 헤더(설계 renewal.design §1.2 TR-01).
 * 모달·전체 페이지가 동일한 VESTRA 브랜드 영역을 공유한다(구 VestraLogoMark 톤 교체 기준).
 */

import { SIGNUP_THEME } from "./signup-theme";

interface RenewalBrandProps {
  /** 브랜드 아래 보조 문구(단계·유형 안내). 기본값은 서비스 소개. */
  subtitle?: string;
}

export function RenewalBrand({ subtitle = "AI 부동산 자산관리 플랫폼" }: RenewalBrandProps) {
  return (
    <div style={{ textAlign: "center", marginBottom: 22 }}>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.22em", color: SIGNUP_THEME.text }}>
        VESTRA
      </div>
      {subtitle && (
        <p style={{ marginTop: 6, fontSize: 13, color: SIGNUP_THEME.muted }}>{subtitle}</p>
      )}
    </div>
  );
}
