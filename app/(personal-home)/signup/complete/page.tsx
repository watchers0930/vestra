"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BusinessInfoForm from "./components/BusinessInfoForm";
import UserTypeSelector from "./components/UserTypeSelector";
import { VestraLogoMark } from "@/components/common/VestraLogo";
import { Button } from "@/components/common/Button";
import { stepPath } from "@/app/(personal-home)/signup/business/wizardConfig";

function SignupCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  // URL searchParam 우선, OAuth 리다이렉트 후 없으면 sessionStorage에서 읽음
  const [intendedRole, setIntendedRole] = useState<string | null>(
    searchParams.get("intendedRole")
  );

  useEffect(() => {
    if (intendedRole) return; // URL에서 이미 가져온 경우 건너뜀
    const stored = sessionStorage.getItem("intendedRole");
    if (stored) {
      setIntendedRole(stored);
      sessionStorage.removeItem("intendedRole");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount에서만 실행

  const isValidRole =
    intendedRole === "PERSONAL" ||
    intendedRole === "RENTAL_BIZ" ||
    intendedRole === "REALESTATE" ||
    intendedRole === "BUSINESS";
  const requiresBusinessInfo =
    intendedRole === "RENTAL_BIZ" ||
    intendedRole === "REALESTATE" ||
    intendedRole === "BUSINESS";
  const [needsBusinessInfo, setNeedsBusinessInfo] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<"TENANT" | "LANDLORD" | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

  // 미로그인 상태면 renewal 홈으로 이동 후 로그인 모달 오픈
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/home?auth=login");
    }
  }, [status, router]);

  // 역할 설정 호출. 성공 시 유형별 다음 단계로 연결하고, 실패는 성공으로 이동시키지 않고 재시도를 제공한다(§7.3).
  const runSetup = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setSetupError(null);
    try {
      const res = await fetch("/api/user/setup-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: intendedRole, userType: selectedUserType }),
      });
      if (res.ok) {
        // 역할 설정 성공. 서버 상태에 따라 다음 단계로 연결한다(§5.2·§7.3).
        //  - 사업자(RENTAL_BIZ/REALESTATE/BUSINESS): 이미 사업자정보가 있어 200이면 신청이 접수(requested/pending)
        //    된 상태다. 세션 JWT(60초 캐시)를 신뢰해 완료로 넘기지 말고, 서버 온보딩 verifyStatus를 권위로
        //    읽는 사업자 인증 단계(2)로 보낸다(이전 버그: 바로 3단계 → 셸이 다시 2단계로 되돌림).
        //  - 개인(PERSONAL): 인증 단계 없음 → 플랜 선택(3). FREE/PRO 선택지, 미결제여도 앱 접근 가능.
        router.push(requiresBusinessInfo ? stepPath(2) : stepPath(3));
        return;
      }
      if (res.status === 422) {
        // 사업자 정보 입력 필요 — 폼 표시(기존 흐름 유지).
        setNeedsBusinessInfo(true);
        isProcessingRef.current = false;
        return;
      }
      // 기타 오류(400/5xx 등): 성공으로 이동시키지 않고 현재 화면에서 재시도(§7.3 — "기타 에러 → /home" 교정).
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setSetupError(data?.error || "역할 설정에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      isProcessingRef.current = false;
    } catch {
      setSetupError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
      isProcessingRef.current = false;
    }
  }, [intendedRole, selectedUserType, requiresBusinessInfo, router]);

  useEffect(() => {
    if (
      status !== "authenticated" ||
      !intendedRole ||
      !isValidRole ||
      needsBusinessInfo ||
      setupError // 오류 표시 중에는 자동 재시도하지 않는다(사용자가 재시도 버튼으로 재개).
    ) {
      return;
    }
    // PERSONAL은 userType 선택 후 진행
    if (intendedRole === "PERSONAL" && !selectedUserType) {
      return;
    }
    void runSetup();
  }, [status, intendedRole, isValidRole, needsBusinessInfo, selectedUserType, setupError, runSetup]);

  // 로딩 중
  if (status === "loading") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">계정을 설정하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // 미로그인
  if (status === "unauthenticated") {
    return null;
  }

  // intendedRole이 없거나 유효하지 않은 경우
  if (!intendedRole || !isValidRole) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted mb-4">잘못된 접근입니다.</p>
          <button
            onClick={() => router.push("/home?auth=login")}
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 역할 설정 실패 — 재시도 안내(실패를 성공/홈으로 넘기지 않는다, §7.3)
  if (setupError) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <p className="text-sm text-red-500 mb-4">{setupError}</p>
          <Button variant="primary" onClick={() => void runSetup()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  // PERSONAL: userType 선택 화면
  if (intendedRole === "PERSONAL" && !selectedUserType) {
    return <UserTypeSelector onSelect={setSelectedUserType} />;
  }

  if (!requiresBusinessInfo || !needsBusinessInfo) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">계정을 설정하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // REALESTATE / RENTAL_BIZ / BUSINESS: 기업정보 입력 폼 표시
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="w-full max-w-lg px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <VestraLogoMark size={48} className="mb-3 mx-auto" />
          <h1
            className="text-xl font-bold text-foreground tracking-widest"
            style={{ fontFamily: "var(--font-sora)" }}
          >
            VESTRA
          </h1>
          <p className="text-muted text-sm mt-1">
            {intendedRole === "REALESTATE"
              ? "부동산 중개사 등록"
              : intendedRole === "RENTAL_BIZ"
                ? "임대사업자 등록"
                : "기업 회원 등록"}
          </p>
        </div>

        <BusinessInfoForm intendedRole={intendedRole} />
      </div>
    </div>
  );
}

export default function SignupCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignupCompleteContent />
    </Suspense>
  );
}
