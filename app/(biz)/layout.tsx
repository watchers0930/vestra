import { redirect } from "next/navigation";
import SessionGuard from "@/components/auth/session-guard";
import { auth } from "@/lib/auth";
import RealtorGnb from "./_shared/RealtorGnb";
import RealtorFooter from "./_shared/RealtorFooter";

/**
 * 사업자 전용 레이아웃 (중개사 REALESTATE · 임대사업자 RENTAL_BIZ 공용).
 * 임대사업자도 중개사와 동일한 기본 UI(RealtorGnb)를 사용한다.
 * 서버에서 역할을 판별해 클라이언트 우회를 차단한다.
 * 그 외 역할은 로그인 후 역할 분배 허브(/dashboard)로 돌려보낸다.
 */
export default async function BizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/realtor");
  const role = session.user.role;
  if (role !== "REALESTATE" && role !== "RENTAL_BIZ") redirect("/dashboard");

  return (
    <SessionGuard>
      <RealtorGnb />
      <main id="main-content" style={{ minHeight: "calc(100vh - 80px)", background: "#fff" }}>
        {children}
      </main>
      <RealtorFooter />
    </SessionGuard>
  );
}
