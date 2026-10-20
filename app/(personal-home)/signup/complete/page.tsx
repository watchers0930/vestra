"use client";

/**
 * OAuth 복귀·가입 정보 진입점(설계 renewal.design §1.4·§4.2 F-2·F-3). 표시 단계 3 "가입 정보"에 해당한다.
 *
 * 개인(PERSONAL): 세부유형(TENANT/LANDLORD) 선택 → setup-role → 플랜 선택(step-3).
 * 사업자(RENTAL_BIZ/REALESTATE/BUSINESS): 서버 온보딩 verifyStatus가 **권위**다.
 *  - verified → 플랜 선택(step-3)로 이어감(재접수 호출 없음).
 *  - pending  → 승인 대기(step-2)로 이어감(재접수 호출 없음).
 *  - none/rejected → 정보 입력 폼(사용자가 명시적으로 제출 — 승인 후 자동 재호출 금지).
 *
 * ⚠️ 이전 구현은 사업자 역할에서 마운트 시 setup-role을 {role}만으로 자동 재호출했다. 서버는 이미 사업자정보가
 * 있으면 verifyStatus를 **pending으로 되돌리므로**, 승인(verified) 사용자가 이 화면에 재진입하면 승인이 취소됐다
 * (AC-05 회귀). 따라서 자동 재호출을 제거하고 온보딩 상태로 분기만 한다. 구 톤(VestraLogoMark/text-muted)은
 * 공통 renewal 셸·토큰으로 교체한다. API 계약은 변경하지 않는다.
 */

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BusinessInfoForm from "./components/BusinessInfoForm";
import UserTypeSelector from "./components/UserTypeSelector";
import { stepPath } from "@/app/(personal-home)/signup/business/wizardConfig";
import { RenewalSignupShell } from "@/app/(personal-home)/renewal/_shared/RenewalSignupShell";
import { RenewalStageBar } from "@/app/(personal-home)/renewal/_shared/RenewalStageBar";
import { useOnboardingStatus } from "@/app/(personal-home)/signup/hooks/useOnboardingStatus";
import { useRoleSetup } from "@/app/(personal-home)/signup/hooks/useRoleSetup";
import {
  LoadingPanel,
  ErrorPanel,
  ReauthPanel,
  ReceivedPanel,
  RenewalStatusPanel,
} from "@/app/(personal-home)/renewal/_shared/RenewalStatusPanels";
import { Button } from "@/components/common/Button";

const LOGIN_PATH = "/home?auth=login";

const BIZ_ROLES = ["RENTAL_BIZ", "REALESTATE", "BUSINESS"] as const;

/** 표시 단계 3(가입 정보) — 셸 공통 래퍼. 완료 체크는 [1,2]만(현재 단계는 진행 중). */
function Stage3Shell({ subtitle, children }: { subtitle?: string; children: React.ReactNode }) {
  return (
    <RenewalSignupShell
      subtitle={subtitle}
      stageBar={<RenewalStageBar current={3} completed={[1, 2]} reachable={3} />}
    >
      {children}
    </RenewalSignupShell>
  );
}

function SignupCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, update } = useSession();
  const onboarding = useOnboardingStatus();
  const { error: setupError, setupPersonal } = useRoleSetup();

  // URL searchParam 우선, OAuth 리다이렉트 후 없으면 sessionStorage에서 읽음.
  const [intendedRole, setIntendedRole] = useState<string | null>(searchParams.get("intendedRole"));
  useEffect(() => {
    if (intendedRole) return;
    const stored = sessionStorage.getItem("intendedRole");
    if (stored) {
      setIntendedRole(stored);
      sessionStorage.removeItem("intendedRole");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValidRole =
    intendedRole === "PERSONAL" || (BIZ_ROLES as readonly string[]).includes(intendedRole ?? "");
  const isBusiness = (BIZ_ROLES as readonly string[]).includes(intendedRole ?? "");

  const [selectedUserType, setSelectedUserType] = useState<"TENANT" | "LANDLORD" | null>(null);
  // 사업자 접수 성공을 상위에서 안정적으로 보존한다. 세션 갱신(update())·온보딩 재조회가 이 서브트리를
  // 재구성해도 접수 패널이 유실되지 않게 하고, 접수 중에는 verified/pending 자동 라우팅을 억제한다(High-B).
  const [bizReceived, setBizReceived] = useState(false);

  // 미로그인 → renewal 홈으로 이동 후 로그인 모달.
  useEffect(() => {
    if (status === "unauthenticated") router.push(LOGIN_PATH);
  }, [status, router]);

  // 개인(PERSONAL) 역할 설정. 사업자는 폼 제출(BusinessInfoForm)로만 setup-role을 호출한다(자동 재호출 금지).
  const runPersonalSetup = useCallback(async () => {
    if (!selectedUserType) return;
    const result = await setupPersonal(selectedUserType);
    if (result.ok) router.push(stepPath(3)); // 개인: 인증 단계 없이 플랜 선택으로.
  }, [selectedUserType, setupPersonal, router]);

  // 개인: 세부유형 선택 후 자동 설정 실행(오류 표시 중에는 수동 재시도). 중복 제출은 훅의 잠금이 막는다.
  useEffect(() => {
    if (status !== "authenticated" || intendedRole !== "PERSONAL" || !selectedUserType || setupError) return;
    void runPersonalSetup();
  }, [status, intendedRole, selectedUserType, setupError, runPersonalSetup]);

  // 사업자: 온보딩 verifyStatus로 분기(권위). verified/pending은 setup-role 재호출 없이 다음 단계로 라우팅하되,
  // 접수 직후(bizReceived)에는 자동 라우팅을 억제해 사용자가 접수 패널에서 명시적으로 이어가게 한다.
  const verifyStatus = onboarding.state?.verifyStatus ?? null;
  useEffect(() => {
    if (status !== "authenticated" || !isBusiness || bizReceived) return;
    if (onboarding.loading || onboarding.error || onboarding.reauthRequired || !onboarding.state) return;
    if (verifyStatus === "verified") router.replace(stepPath(3));
    else if (verifyStatus === "pending") router.replace(stepPath(2));
    // none/rejected는 아래에서 정보 입력 폼을 렌더한다(사용자가 직접 제출).
  }, [status, isBusiness, bizReceived, onboarding.loading, onboarding.error, onboarding.reauthRequired, onboarding.state, verifyStatus, router]);

  // 사업자 표시 라벨(접수 패널·셸 부제). bizReceived는 사업자에서만 true가 되므로 그때 유효하다.
  const bizSubtitle =
    intendedRole === "REALESTATE" ? "부동산 중개사 등록" : intendedRole === "RENTAL_BIZ" ? "임대사업자 등록" : "기업 회원 등록";
  const bizRoleLabel =
    intendedRole === "REALESTATE" ? "중개사" : intendedRole === "RENTAL_BIZ" ? "임대사업자" : "기업";

  // 세션 로딩 — 단, 사업자 접수 완료(bizReceived) 중에는 세션 update()로 인한 재로딩이 접수 패널을 가리지
  // 않도록 아래 접수 패널 분기로 넘긴다(High-B).
  if (status === "loading" && !bizReceived) {
    return (
      <Stage3Shell>
        <LoadingPanel message="계정을 확인하고 있습니다…" />
      </Stage3Shell>
    );
  }
  if (status === "unauthenticated") return null;

  // 사업자 접수 완료: 세션 갱신/온보딩 지연과 무관하게 접수 패널을 안정적으로 표시한다(POST 성공 보존, #2).
  // 사용자가 명시적으로 "승인 대기 화면으로"를 눌러야 다음 단계로 이어간다(자동 이동 없음).
  if (bizReceived) {
    return (
      <Stage3Shell subtitle={bizSubtitle}>
        <ReceivedPanel roleLabel={bizRoleLabel} onContinue={() => router.push(stepPath(2))} />
      </Stage3Shell>
    );
  }

  // 잘못된 접근(역할 없음/무효)
  if (!intendedRole || !isValidRole) {
    return (
      <Stage3Shell>
        <RenewalStatusPanel
          title="잘못된 접근입니다"
          tone="danger"
          banner="회원 유형 정보를 확인할 수 없습니다. 처음부터 다시 시작해 주세요."
          actions={
            <Button variant="primary" fullWidth onClick={() => router.push(LOGIN_PATH)}>
              로그인으로 돌아가기
            </Button>
          }
        />
      </Stage3Shell>
    );
  }

  // 개인 역할 설정 실패 — 재시도(실패를 성공/홈으로 넘기지 않는다, §3.2). setupError는 개인 플로우 전용.
  if (intendedRole === "PERSONAL" && setupError) {
    return (
      <Stage3Shell>
        <ErrorPanel
          title="역할 설정에 실패했습니다"
          message={setupError}
          onRetry={() => void runPersonalSetup()}
        />
      </Stage3Shell>
    );
  }

  // 개인: 세부유형 선택
  if (intendedRole === "PERSONAL") {
    if (!selectedUserType) {
      return (
        <Stage3Shell subtitle="일반 회원 · 세부 유형 선택">
          <UserTypeSelector onSelect={setSelectedUserType} />
        </Stage3Shell>
      );
    }
    return (
      <Stage3Shell subtitle="일반 회원">
        <LoadingPanel message="계정을 설정하고 있습니다…" />
      </Stage3Shell>
    );
  }

  // 사업자: 온보딩 상태 기반 분기. 순서가 중요하다 — 재인증 → 오류 → 로딩 → 상태없음 → 라우팅중 → 폼.
  // (이전 순서는 loading||!state를 오류보다 먼저 평가해, 최초 GET 실패 시 error가 있어도 state=null이면
  //  영구 로딩에 가려 재시도에 도달하지 못했다. #1 회귀 수정.)
  if (onboarding.unauthenticated || onboarding.reauthRequired) {
    return (
      <Stage3Shell subtitle={bizSubtitle}>
        <ReauthPanel onLogin={() => router.push(LOGIN_PATH)} />
      </Stage3Shell>
    );
  }
  if (onboarding.error) {
    return (
      <Stage3Shell subtitle={bizSubtitle}>
        <ErrorPanel message={onboarding.error} onRetry={() => void onboarding.refresh()} />
      </Stage3Shell>
    );
  }
  if (onboarding.loading) {
    return (
      <Stage3Shell subtitle={bizSubtitle}>
        <LoadingPanel message="가입 상태를 확인하고 있습니다…" />
      </Stage3Shell>
    );
  }
  if (!onboarding.state) {
    // 로딩도 오류도 아닌데 상태가 없다 → 복구 가능한 오류로 처리(영구 로딩 방지, AC-06).
    return (
      <Stage3Shell subtitle={bizSubtitle}>
        <ErrorPanel message="가입 상태를 확인하지 못했습니다." onRetry={() => void onboarding.refresh()} />
      </Stage3Shell>
    );
  }
  // verified/pending은 라우팅 중(위 effect) — 로딩 표시. none/rejected만 폼 렌더.
  if (verifyStatus === "verified" || verifyStatus === "pending") {
    return (
      <Stage3Shell subtitle={bizSubtitle}>
        <LoadingPanel message="다음 단계로 이동하고 있습니다…" />
      </Stage3Shell>
    );
  }
  return (
    <Stage3Shell subtitle={bizSubtitle}>
      {verifyStatus === "rejected" && (
        <div
          role="alert"
          style={{
            marginBottom: 14,
            borderRadius: 12,
            background: "#fff4f3",
            color: "#c0392b",
            padding: "11px 14px",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          이전 인증 신청이 반려되었습니다. 정보를 다시 확인해 제출해 주세요.
        </div>
      )}
      <BusinessInfoForm
        intendedRole={intendedRole}
        onReceived={() => {
          // 접수 성공을 먼저 보존(세션 갱신·온보딩 재조회가 덮지 않도록). 세션 갱신은 상위가 best-effort로
          // 수행하며, 실패해도 접수 패널은 유지된다(다음 화면은 서버 온보딩 GET이 권위이므로 JWT 지연과 무관).
          setBizReceived(true);
          // 세션 갱신 실패는 접수 성공과 분리한다(실패해도 접수 패널 유지). unhandled rejection 방지.
          void update().catch(() => {});
        }}
      />
    </Stage3Shell>
  );
}

export default function SignupCompletePage() {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <SignupCompleteContent />
    </Suspense>
  );
}
