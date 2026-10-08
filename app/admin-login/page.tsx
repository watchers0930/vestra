"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { VestraLogoMark } from "@/components/common/VestraLogo";

/**
 * 관리자 전용 로그인 페이지 (미니멀)
 * ──────────────────────────────────────────
 * /admin 비로그인 접속 시 proxy가 이 경로로 보낸다.
 * 루트 레이아웃만 타므로 GNB·사이드바 없이 로고 + 폼 + 간단 푸터만 노출.
 * 인증은 Credentials(이메일+비번, role=ADMIN만 authorize).
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 이미 관리자 세션이면 대시보드로
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다");
    } else {
      try { sessionStorage.setItem("vestra_alive", "1"); } catch {}
      router.push("/admin");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbfd]">
      {/* 헤더 — 베스트라 로고 */}
      <header className="flex items-center justify-center gap-2.5 border-b border-[#e5e5e7] bg-white px-4 py-4">
        <VestraLogoMark size={28} />
        <span
          className="text-[17px] font-bold tracking-widest text-[#1d1d1f]"
          style={{ fontFamily: "var(--font-sora)" }}
        >
          VESTRA
        </span>
      </header>

      {/* 중앙 로그인 폼 */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-[#e5e5e7] bg-white p-8">
            <h1 className="mb-1 text-center text-lg font-semibold text-[#1d1d1f]">관리자 로그인</h1>
            <p className="mb-6 text-center text-sm text-[#6e6e73]">관리자 계정으로 로그인하세요</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="관리자 이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="w-full rounded-lg border border-[#e5e5e7] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-[#e5e5e7] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* 간단 푸터 — 사업자 정보 */}
      <footer className="border-t border-[#e5e5e7] bg-white px-4 py-6 text-center">
        <div className="space-y-1 text-[11px] leading-relaxed text-[#86868b]">
          <p>BMI C&amp;S | 대표이사 김동의</p>
          <p>사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189</p>
          <p>서울시 금천구 디지털로10길 78. 813호 | 고객센터 010-8490-9271</p>
          <p className="pt-1">© 2026 BMI-C&amp;S All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
