"use client";

/**
 * renewal 가입 공통 셸(설계 renewal.design §1.2 TR-01).
 *
 * 브랜드 + 진행바 슬롯 + 본문 카드 슬롯 + CTA 영역을 조합한다. 모달/풀페이지는 호스트(바깥 컨테이너)만
 * 다르고 내부 표현은 이 셸로 통일한다 — 모달→OAuth 복귀→정보/대기→플랜→결제→완료가 끊기지 않게 한다.
 * 정상·로딩·오류·접수·대기·반려·완료·Suspense 모두 같은 셸을 사용한다.
 */

import type { ReactNode } from "react";
import { RenewalBrand } from "./RenewalBrand";

interface RenewalSignupShellProps {
  /** 브랜드 헤더 표시 여부(전체 페이지=true). 모달 등 자체 브랜드가 있으면 false. */
  showBrand?: boolean;
  /** 브랜드 아래 보조 문구(단계·유형 안내). */
  subtitle?: string;
  /** 상위 진행바(RenewalStageBar). 생략 시 진행바 영역 없음(단순 상태 화면). */
  stageBar?: ReactNode;
  /** 본문 카드 영역. */
  children: ReactNode;
  /** 하단 CTA/링크 영역(선택). */
  footer?: ReactNode;
  /** 본문 최대 폭(px). 폼/상태=560, 플랜·결제=720 등 호스트가 지정. */
  maxWidth?: number;
  /** 페이지 세로 중앙 정렬 여부(전체 페이지=true). 모달 내부 주입 시 false. */
  centered?: boolean;
}

export function RenewalSignupShell({
  showBrand = true,
  subtitle,
  stageBar,
  children,
  footer,
  maxWidth = 560,
  centered = true,
}: RenewalSignupShellProps) {
  return (
    <div
      style={
        centered
          ? { minHeight: "80vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 16px" }
          : { width: "100%" }
      }
    >
      <div style={{ width: "100%", maxWidth }}>
        {showBrand && <RenewalBrand subtitle={subtitle} />}
        {stageBar && <div style={{ marginBottom: 28 }}>{stageBar}</div>}
        {children}
        {footer && <div style={{ marginTop: 20 }}>{footer}</div>}
      </div>
    </div>
  );
}
