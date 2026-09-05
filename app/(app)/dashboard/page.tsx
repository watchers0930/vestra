import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

// open-redirect 방어: 내부 절대경로(/ 시작, // 아님)만 허용
function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/**
 * 대시보드는 로그인 후 역할 분배 허브를 겸한다.
 * 서버에서 즉시 redirect하므로 개인 계정이 구(app) 사이드바 UI를 스치지 않는다.
 * - ADMIN        → /admin
 * - LAWYER       → /lawyer
 * - REALESTATE   → /realtor (중개사 전용 리뉴얼 홈)
 * - PERSONAL     → 로그인 직전 화면(?next=) 있으면 그곳, 없으면 /home
 * - 그 외 사업자  → 대시보드 유지 (RENTAL_BIZ / BUSINESS)
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  const role = session?.user?.role;

  if (role === "ADMIN") redirect("/admin");
  if (role === "LAWYER") redirect("/lawyer");
  if (role === "REALESTATE") redirect("/realtor");
  if (role === "PERSONAL") {
    const { next } = await searchParams;
    redirect(safeInternalPath(next) || "/home");
  }

  // RENTAL_BIZ / BUSINESS (및 미확정 역할): 대시보드 콘텐츠 렌더
  return <DashboardClient />;
}
