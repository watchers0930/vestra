import { redirect } from "next/navigation";
import SessionGuard from "@/components/auth/session-guard";
import { auth } from "@/lib/auth";
import RealtorGnb from "./_shared/RealtorGnb";

/**
 * 사업자(중개사) 전용 레이아웃.
 * REALESTATE 역할만 접근 가능 — 서버에서 판별해 클라이언트 우회를 차단한다.
 * 그 외 역할은 로그인 후 역할 분배 허브(/dashboard)로 돌려보낸다.
 */
export default async function BizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/realtor");
  if (session.user.role !== "REALESTATE") redirect("/dashboard");

  return (
    <SessionGuard>
      <RealtorGnb />
      <main id="main-content" style={{ minHeight: "calc(100vh - 80px)", background: "#fff" }}>
        {children}
      </main>
    </SessionGuard>
  );
}
