"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearAll } from "@/lib/store";
import { VestraLogoMark } from "@/components/common/VestraLogo";
import RoleTypeSelector from "./components/RoleTypeSelector";

export default function SignupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // 이미 로그인된 상태: localStorage 초기화 후 역할별 리다이렉트
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      clearAll();
      if (session.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [session, status, router]);

  const handleSocialLogin = (provider: "google" | "naver") => {
    if (!selectedRole) return;
    signIn(provider, {
      redirectTo: `/signup/complete?intendedRole=${selectedRole}`,
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="w-full max-w-3xl px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <VestraLogoMark size={64} className="mb-4 mx-auto" />
          <h1
            className="text-2xl font-bold text-foreground tracking-widest"
            style={{ fontFamily: "var(--font-sora)" }}
          >
            VESTRA
          </h1>
          <p className="text-muted text-sm mt-1">AI 자산관리 플랫폼</p>
        </div>

        {/* 회원가입 카드 */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          {/* 단계 1: 유형 선택 */}
          <h2 className="text-lg font-semibold text-center mb-1">회원가입</h2>
          <p className="text-center text-sm text-muted mb-6">
            이용 목적에 맞는 회원 유형을 선택해 주세요
          </p>

          <RoleTypeSelector
            selectedRole={selectedRole}
            onSelect={setSelectedRole}
          />

          {/* 단계 2: 소셜 로그인 (유형 선택 후 표시) */}
          {selectedRole && (
            <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted">소셜 계정으로 시작</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <div className="space-y-3 max-w-md mx-auto">
                {/* Google */}
                <button
                  onClick={() => handleSocialLogin("google")}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google로 시작하기
                </button>

                {/* 네이버 */}
                <button
                  onClick={() => handleSocialLogin("naver")}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#03C75A] hover:bg-[#02B550] transition-colors text-sm font-medium text-white cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      d="M16.27 3H7.73A4.73 4.73 0 003 7.73v8.54A4.73 4.73 0 007.73 21h8.54A4.73 4.73 0 0021 16.27V7.73A4.73 4.73 0 0016.27 3zm-2.15 12.38l-2.6-3.71v3.71H9.06V8.62h2.46l2.6 3.71V8.62h2.46v6.76h-2.46z"
                      fill="white"
                    />
                  </svg>
                  네이버로 시작하기
                </button>
              </div>
            </div>
          )}

          {/* 구분선 */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted">또는</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* 게스트 체험 */}
          <button
            onClick={() => router.push("/rights")}
            className="w-full px-4 py-3 rounded-xl border border-border text-sm text-muted hover:text-foreground hover:bg-gray-50 transition-colors max-w-md mx-auto block cursor-pointer"
          >
            가입 없이 체험하기 (일 2회 제한)
          </button>
        </div>

        {/* 로그인 안내 */}
        <p className="text-center text-sm text-muted mt-6">
          이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
