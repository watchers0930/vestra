"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BusinessInfoForm from "./components/BusinessInfoForm";
import { VestraLogoMark } from "@/components/common/VestraLogo";

function SignupCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, update } = useSession();

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
    intendedRole === "REALESTATE" ||
    intendedRole === "BUSINESS";
  const requiresBusinessInfo =
    intendedRole === "REALESTATE" || intendedRole === "BUSINESS";
  const [needsBusinessInfo, setNeedsBusinessInfo] = useState(false);
  const isProcessingRef = useRef(false);

  // 미로그인 상태면 login으로 리다이렉트
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // 로그인 완료 시 역할 설정 API 호출
  useEffect(() => {
    if (
      status !== "authenticated" ||
      !intendedRole ||
      !isValidRole ||
      isProcessingRef.current ||
      needsBusinessInfo
    ) {
      return;
    }

    isProcessingRef.current = true;

    fetch("/api/user/setup-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: intendedRole }),
    })
      .then(async (res) => {
        if (res.ok) {
          // 역할 전환 성공 (PERSONAL 또는 이미 business info 있는 경우)
          await update();
          router.push("/dashboard");
        } else if (res.status === 422) {
          // business info 입력 필요
          setNeedsBusinessInfo(true);
          isProcessingRef.current = false;
        } else {
          // 기타 에러 → 대시보드로 이동
          router.push("/dashboard");
        }
      })
      .catch(() => {
        router.push("/dashboard");
      });
  }, [status, intendedRole, isValidRole, needsBusinessInfo, update, router]);

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
            onClick={() => router.push("/login")}
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    );
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

  // REALESTATE 또는 BUSINESS: 기업정보 입력 폼 표시
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
