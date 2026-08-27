"use client";

import { signIn } from "next-auth/react";
import { markSignupIntent } from "@/lib/signup-intent";

/** 로그인 후 전문가 가입 폼으로 복귀 */
const CALLBACK = "/renewal/expert-signup";

/**
 * 전문가 가입 로그인 게이트.
 * 전문가 계정은 소셜 User와 1:1 연결(LawyerPartner.userId)되므로, 폼 입력 전 로그인이 선행되어야 한다.
 * 신규 전문가는 소셜 계정이 없어 "미가입 소셜 차단"에 막히므로, 일반 가입과 동일하게 markSignupIntent()로 신규 생성을 허용한다.
 */
export default function ExpertLoginGate() {
  const handleSocial = (provider: "google" | "naver") => {
    markSignupIntent();
    signIn(provider, { callbackUrl: CALLBACK });
  };

  return (
    <div className="border border-gray-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">전문가 가입은 계정 연동이 필요합니다</h2>
      <p className="text-sm text-gray-500 mb-5">
        소셜 계정으로 로그인한 뒤 전문가 자격 정보를 등록하면, 심사 후 전문가 계정이 승인됩니다.
      </p>

      <div className="flex flex-col gap-2.5 max-w-sm">
        <button
          type="button"
          onClick={() => handleSocial("google")}
          className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google로 계속하기
        </button>
        <button
          type="button"
          onClick={() => handleSocial("naver")}
          className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl bg-[#03C75A] text-sm font-medium text-white hover:brightness-95 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path d="M16.27 3H7.73A4.73 4.73 0 003 7.73v8.54A4.73 4.73 0 007.73 21h8.54A4.73 4.73 0 0021 16.27V7.73A4.73 4.73 0 0016.27 3zm-2.15 12.38l-2.6-3.71v3.71H9.06V8.62h2.46l2.6 3.71V8.62h2.46v6.76h-2.46z" fill="white" />
          </svg>
          네이버로 계속하기
        </button>
      </div>
    </div>
  );
}
