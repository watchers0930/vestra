import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SessionGuard from "@/components/auth/session-guard";
import { LawyerHeader } from "./components/LawyerHeader";

/**
 * 전문가(변호사) 전용 레이아웃 — 서버 역할 가드 + 전용 헤더 (개인용 사이드바 없음)
 *
 * 서버에서 세션 role을 검증한다(클라이언트 우회 차단).
 * - 미로그인 → 로그인 페이지(복귀 경로 전달)
 * - LAWYER 아님 → 일반 대시보드
 */
export default async function LawyerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/lawyer/dashboard");
  if (session.user.role !== "LAWYER") redirect("/dashboard");

  return (
    <SessionGuard>
      <div className="min-h-screen bg-gray-50">
        <LawyerHeader />
        <main>{children}</main>
      </div>
    </SessionGuard>
  );
}
