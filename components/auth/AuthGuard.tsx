"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Lock, LogIn, User } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  featureName?: string;
}

export function AuthGuard({ children, featureName }: AuthGuardProps) {
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
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-[420px] text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f5f5f7]">
            <Lock size={28} strokeWidth={1.5} className="text-[#6e6e73]" />
          </div>
          <h2 className="text-xl font-bold text-[#1d1d1f] mb-2">
            로그인이 필요한 기능입니다
          </h2>
          <p className="text-sm text-[#6e6e73] mb-8 leading-relaxed">
            {featureName
              ? `${featureName} 기능을 이용하려면 로그인해주세요.`
              : "이 기능을 이용하려면 로그인해주세요."}
          </p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-[#1d1d1f] text-white text-sm font-medium hover:bg-[#333] transition-colors"
            >
              <LogIn size={16} /> 로그인
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border border-[#e5e5e7] text-sm text-[#1d1d1f] font-medium hover:bg-[#f5f5f7] transition-colors"
            >
              <User size={16} /> 회원가입
            </Link>
          </div>
          <div className="mt-8 pt-6 border-t border-[#e5e5e7]">
            <p className="text-xs text-[#6e6e73] mb-3">로그인 없이 바로 이용 가능</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/price-map" className="text-xs px-3 py-1.5 rounded-full bg-[#f5f5f7] text-[#0071e3] hover:bg-[#eee] transition-colors">
                시세지도
              </Link>
              <Link href="/official-price" className="text-xs px-3 py-1.5 rounded-full bg-[#f5f5f7] text-[#0071e3] hover:bg-[#eee] transition-colors">
                공시가격
              </Link>
              <Link href="/tax" className="text-xs px-3 py-1.5 rounded-full bg-[#f5f5f7] text-[#0071e3] hover:bg-[#eee] transition-colors">
                세금계산
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
