"use client";

import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { VestraLogoMark } from "@/components/common/VestraLogo";

interface AuthGuardProps {
  children: React.ReactNode;
  featureName?: string;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#fbfbfd] px-4 py-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 text-center">
            <VestraLogoMark size={56} className="mx-auto mb-4" />
            <h1
              className="text-[21px] font-bold tracking-widest text-[#1d1d1f]"
              style={{ fontFamily: "var(--font-sora)" }}
            >
              VESTRA
            </h1>
            <p className="mt-1 text-sm text-[#6e6e73]">AI 자산관리 플랫폼</p>
          </div>

          <div className="rounded-2xl border border-[#e5e5e7] bg-white p-8">
            <h2 className="mb-6 text-center text-lg font-semibold text-[#1d1d1f]">로그인</h2>

            <div className="space-y-3">
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#e5e5e7] bg-white px-4 py-3 text-sm font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google로 로그인
              </button>

              <button
                onClick={() => signIn("naver", { callbackUrl: "/dashboard" })}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#03C75A] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#02B550]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M16.27 3H7.73A4.73 4.73 0 003 7.73v8.54A4.73 4.73 0 007.73 21h8.54A4.73 4.73 0 0021 16.27V7.73A4.73 4.73 0 0016.27 3zm-2.15 12.38l-2.6-3.71v3.71H9.06V8.62h2.46l2.6 3.71V8.62h2.46v6.76h-2.46z" fill="white" />
                </svg>
                네이버로 로그인
              </button>
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 border-t border-[#e5e5e7]" />
              <span className="text-xs text-[#6e6e73]">또는</span>
              <div className="flex-1 border-t border-[#e5e5e7]" />
            </div>

            <div className="space-y-2">
              <p className="text-center text-[11px] font-medium tracking-wide text-[#86868b]">로그인 없이 바로 이용</p>
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href="/price-map"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-[#e5e5e7] px-2 py-3 transition-colors hover:border-[#0071e3]/20 hover:bg-[#f5f5f7]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#0071e3]" style={{ fontVariationSettings: "'FILL' 0,'wght' 300" }}>map</span>
                  <span className="text-[11px] font-medium text-[#1d1d1f]">시세지도</span>
                </Link>
                <Link
                  href="/official-price"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-[#e5e5e7] px-2 py-3 transition-colors hover:border-[#0071e3]/20 hover:bg-[#f5f5f7]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#0071e3]" style={{ fontVariationSettings: "'FILL' 0,'wght' 300" }}>account_balance</span>
                  <span className="text-[11px] font-medium text-[#1d1d1f]">공시가격</span>
                </Link>
                <Link
                  href="/tax"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-[#e5e5e7] px-2 py-3 transition-colors hover:border-[#0071e3]/20 hover:bg-[#f5f5f7]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#0071e3]" style={{ fontVariationSettings: "'FILL' 0,'wght' 300" }}>calculate</span>
                  <span className="text-[11px] font-medium text-[#1d1d1f]">세금계산</span>
                </Link>
              </div>
              <Link
                href="/rights"
                className="block w-full rounded-xl border border-dashed border-[#d2d2d7] px-4 py-2.5 text-center text-xs text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
              >
                권리분석 체험하기 (일 2회 무료)
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-[#6e6e73]">
            아직 계정이 없으신가요?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
