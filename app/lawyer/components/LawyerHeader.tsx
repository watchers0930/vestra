"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

/** 전문가(변호사) 전용 헤더 — 개인용 사이드바 대신 사용 */
export function LawyerHeader() {
  const { data } = useSession();
  const name = data?.user?.name || "전문가";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/lawyer/dashboard" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm">V</span>
          <span className="font-bold text-gray-900">
            VESTRA <span className="text-gray-400 font-medium text-xs">전문가센터</span>
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">{name}님</span>
          <span className="text-gray-300">|</span>
          <Link href="/" className="text-gray-500 hover:text-gray-800">홈</Link>
          <button type="button" onClick={() => signOut({ redirectTo: "/" })} className="text-gray-500 hover:text-gray-800">
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
