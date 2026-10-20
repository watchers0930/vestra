"use client";

/**
 * 사업자 위저드 2단계 — 사업자정보/인증(설계 renewal.design §2.4·§5.1, AC-02·AC-04·AC-05).
 *
 * 인증 상태의 권위는 **서버 온보딩 GET**(`onboarding.state.verifyStatus`, DB 실시간 반영)이다. 세션 JWT의
 * verifyStatus(60초 캐시)를 신뢰하지 않는다. verified일 때만 다음 단계로 진입한다.
 *  - verified: 승인 완료(사실) → 플랜 선택.
 *  - pending : "승인 대기"로 표현(녹색 체크·완료 문구 금지). 수동 "상태 다시 확인" 필수 + 포커스 복귀 시 갱신.
 *  - none/rejected: 사업자 정보 제출로 안내(기존 흐름 재사용). 반려는 재제출 안내.
 *
 * 승인 후 setup-role을 자동 재호출하지 않는다(재신청은 사용자가 명시적으로 제출할 때만 — AC-05).
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/common/Button";
import { SIGNUP_THEME } from "@/app/(personal-home)/renewal/_shared/signup-theme";
import { RenewalStatusPanel, PendingPanel } from "@/app/(personal-home)/renewal/_shared/RenewalStatusPanels";
import { useVisibilityRefresh } from "@/app/(personal-home)/signup/hooks/useVisibilityRefresh";
import { useBusinessWizardContext } from "../BusinessWizardContext";
import { stepPath } from "../wizardConfig";

const LOGIN_PATH = "/home?auth=login";

const BIZ_ROLES: Array<{ role: string; label: string }> = [
  { role: "RENTAL_BIZ", label: "임대사업자" },
  { role: "BUSINESS", label: "기업" },
  { role: "REALESTATE", label: "부동산 중개사" },
];

const ROLE_LABEL: Record<string, string> = {
  RENTAL_BIZ: "임대사업자",
  BUSINESS: "기업",
  REALESTATE: "부동산 중개사",
};

export function Step2Verify() {
  const { onboarding } = useBusinessWizardContext();
  // 셸이 ready(온보딩 확정) 후에만 이 자식을 렌더하므로 state는 존재한다. 방어적으로 "none" 폴백.
  const verifyStatus = onboarding.state?.verifyStatus ?? "none";
  // requestedRole은 온보딩 응답에 없다 — 설명용 힌트만. 없으면 "사업자 회원"(§3.3 TR-03).
  const roleLabel = onboarding.state?.role ? ROLE_LABEL[onboarding.state.role] ?? "사업자 회원" : "사업자 회원";

  const [rechecking, setRechecking] = useState(false);
  // 재확인 실패/세션 만료 안내. "아직 pending"과 "조회 실패"를 구분해 표시하기 위한 로컬 상태(§5.1).
  const [recheckNotice, setRecheckNotice] = useState<{ reauth: boolean; message: string } | null>(null);
  // 수동 재조회는 화면을 유지한 채 상태만 갱신하는 백그라운드 갱신이되(승인되면 verified 패널로 전환),
  // 사용자가 직접 누른 것이므로 force로 최소 간격을 건너뛰고, 실패/재인증은 반환값으로 받아 패널에 표시한다.
  const recheck = useCallback(async () => {
    setRechecking(true);
    setRecheckNotice(null);
    const result = await onboarding.refresh({ background: true, force: true });
    if (!result.ok) {
      setRecheckNotice(
        result.reauth
          ? { reauth: true, message: "세션이 만료되었습니다. 다시 로그인한 뒤 상태를 확인해 주세요." }
          : { reauth: false, message: result.error || "상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." }
      );
    }
    setRechecking(false);
  }, [onboarding]);

  // 포커스/탭 복귀 시 자동 갱신(pending에서만, 최소 간격 throttle + 언마운트 정리 — §5.1).
  useVisibilityRefresh({
    enabled: verifyStatus === "pending",
    onVisible: () => void onboarding.refresh({ background: true }),
  });

  if (verifyStatus === "verified") {
    return (
      <RenewalStatusPanel
        title="사업자 인증 완료"
        tone="success"
        icon={<CheckCircle2 size={16} aria-hidden />}
        banner="사업자 인증이 승인되었습니다. 플랜을 선택해 주세요."
        actions={
          <Link href={stepPath(3)} style={{ textDecoration: "none" }}>
            <Button variant="primary" fullWidth>
              다음: 플랜 선택
            </Button>
          </Link>
        }
      />
    );
  }

  if (verifyStatus === "pending") {
    return (
      <PendingPanel
        roleLabel={roleLabel}
        rechecking={rechecking}
        onRecheck={() => void recheck()}
        notice={
          recheckNotice && (
            <div
              role="alert"
              style={{
                borderRadius: 12,
                background: SIGNUP_THEME.dangerBg,
                color: SIGNUP_THEME.dangerText,
                padding: "11px 14px",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {recheckNotice.message}
              {recheckNotice.reauth && (
                <Link href={LOGIN_PATH} style={{ color: SIGNUP_THEME.dangerText, fontWeight: 600, marginLeft: 6, textDecoration: "underline" }}>
                  다시 로그인
                </Link>
              )}
            </div>
          )
        }
        secondaryAction={
          <Link href="/profile?tab=tier" style={{ textDecoration: "none" }}>
            <Button variant="secondary" fullWidth>
              마이페이지에서 상태 보기
            </Button>
          </Link>
        }
      />
    );
  }

  // none / rejected — 사업자 정보 제출로 안내.
  return (
    <div
      style={{
        borderRadius: SIGNUP_THEME.radius,
        border: `1px solid ${SIGNUP_THEME.border}`,
        background: SIGNUP_THEME.card,
        padding: 28,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ShieldCheck size={20} style={{ color: SIGNUP_THEME.accent }} aria-hidden />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: SIGNUP_THEME.text, margin: 0 }}>사업자 정보 인증</h1>
      </div>
      <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: SIGNUP_THEME.muted }}>
        사업자 유형을 선택하고 사업자번호·상호·대표자 정보를 제출해 주세요. 관리자 승인 후 다음 단계가 열립니다.
      </p>
      {verifyStatus === "rejected" && (
        <p
          role="alert"
          style={{
            marginTop: 14,
            borderRadius: 12,
            background: SIGNUP_THEME.dangerBg,
            color: SIGNUP_THEME.dangerText,
            padding: "11px 14px",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          이전 인증 신청이 반려되었습니다. 정보를 다시 확인해 제출해 주세요.
        </p>
      )}
      <div style={{ marginTop: 18, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
        {BIZ_ROLES.map((r) => (
          <Link key={r.role} href={`/signup/complete?intendedRole=${r.role}`} style={{ textDecoration: "none" }}>
            <Button variant="secondary" fullWidth>
              {r.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
