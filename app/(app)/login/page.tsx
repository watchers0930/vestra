"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showAdmin, setShowAdmin] = useState(false);

  // 이미 로그인된 상태: ADMIN → /admin, 일반 → /dashboard
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (session.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [session, status, router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다");
    } else {
      router.push("/admin");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white text-2xl font-bold mb-4">
            V
          </div>
          <h1 className="text-2xl font-bold text-foreground">VESTRA</h1>
          <p className="text-muted text-sm mt-1">AI 자산관리 플랫폼</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-center mb-6">로그인</h2>

          <div className="space-y-3">
            {/* Google */}
            <button
              onClick={() => signIn("google", { redirectTo: "/login" })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google로 로그인
            </button>

            {/* 카카오 */}
            <button
              onClick={() => signIn("kakao", { redirectTo: "/login" })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#FEE500] hover:bg-[#FDD800] transition-colors text-sm font-medium text-[#191919]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.12a.36.36 0 00.54.38l4.66-3.1c.5.06 1.01.1 1.54.1 5.52 0 10-3.36 10-7.5S17.52 3 12 3z" fill="#191919" />
              </svg>
              카카오로 로그인
            </button>

            {/* 네이버 */}
            <button
              onClick={() => signIn("naver", { redirectTo: "/login" })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#03C75A] hover:bg-[#02B550] transition-colors text-sm font-medium text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M16.27 3H7.73A4.73 4.73 0 003 7.73v8.54A4.73 4.73 0 007.73 21h8.54A4.73 4.73 0 0021 16.27V7.73A4.73 4.73 0 0016.27 3zm-2.15 12.38l-2.6-3.71v3.71H9.06V8.62h2.46l2.6 3.71V8.62h2.46v6.76h-2.46z" fill="white" />
              </svg>
              네이버로 로그인
            </button>
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted">또는</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* 게스트 체험 */}
          <button
            onClick={() => router.push("/rights")}
            className="w-full px-4 py-3 rounded-xl border border-border text-sm text-muted hover:text-foreground hover:bg-gray-50 transition-colors"
          >
            게스트로 체험하기 (일 2회 제한)
          </button>

          {/* 관리자 로그인 */}
          <div className="mt-6">
            <button
              onClick={() => setShowAdmin(!showAdmin)}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showAdmin ? "관리자 로그인 닫기" : "관리자 로그인"}
            </button>

            {showAdmin && (
              <form onSubmit={handleAdminLogin} className="mt-3 space-y-3">
                <input
                  type="email"
                  placeholder="관리자 이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                {error && (
                  <p className="text-xs text-red-500">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loading ? "로그인 중..." : "관리자 로그인"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 회원가입 안내 */}
        <p className="text-center text-sm text-muted mt-6">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
