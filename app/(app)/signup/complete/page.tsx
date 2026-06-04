"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BusinessInfoForm from "./components/BusinessInfoForm";
import { VestraLogoMark } from "@/components/common/VestraLogo";

function SignupCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const intendedRole = searchParams.get("intendedRole");

  // 미로그인 상태면 signup으로 리다이렉트
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signup");
    }
  }, [status, router]);

  // PERSONAL이면 즉시 dashboard로 리다이렉트
  useEffect(() => {
    if (status === "authenticated" && intendedRole === "PERSONAL") {
      router.push("/dashboard");
    }
  }, [status, intendedRole, router]);

  // 로딩 중
  if (status === "loading") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">로그인 상태를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // 미로그인 또는 PERSONAL인 경우 리다이렉트 중이므로 빈 화면
  if (status === "unauthenticated" || intendedRole === "PERSONAL") {
    return null;
  }

  // intendedRole이 없는 경우
  if (!intendedRole || !["REALESTATE", "BUSINESS"].includes(intendedRole)) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted mb-4">잘못된 접근입니다.</p>
          <button
            onClick={() => router.push("/signup")}
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            회원가입으로 돌아가기
          </button>
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
