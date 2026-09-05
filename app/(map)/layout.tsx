import { Suspense } from "react";
import Sidebar from "@/components/layout/sidebar";
import SessionGuard from "@/components/auth/session-guard";
import { auth } from "@/lib/auth";
import RealtorGnb from "@/app/(biz)/_shared/RealtorGnb";
import RealtorSubHero from "@/app/(biz)/_shared/RealtorSubHero";

export default async function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 부동산 중개사(REALESTATE)는 사이드바 대신 상단 nav + 서브 히어로로 통일한다.
  // 지도 높이 = 100vh - nav(80) - 서브히어로(200) = calc(100vh - 280px)
  const session = await auth();
  if (session?.user?.role === "REALESTATE") {
    return (
      <SessionGuard>
        <div className="realtor-theme">
          <RealtorGnb />
          <RealtorSubHero />
          <div style={{ height: "calc(100vh - 280px)", overflow: "hidden" }}>
            {children}
          </div>
        </div>
      </SessionGuard>
    );
  }

  return (
    <>
      <Suspense><Sidebar /></Suspense>
      <div className="lg:ml-[272px] h-screen overflow-hidden">
        {children}
      </div>
    </>
  );
}
