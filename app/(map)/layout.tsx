import { Suspense } from "react";
import Sidebar from "@/components/layout/sidebar";
import SessionGuard from "@/components/auth/session-guard";
import { auth } from "@/lib/auth";
import RealtorGnb from "@/app/(biz)/_shared/RealtorGnb";
import RealtorSubHero from "@/app/(biz)/_shared/RealtorSubHero";
import LandlordGnb from "@/app/(biz)/_shared/LandlordGnb";
import LandlordSubHero from "@/app/(biz)/_shared/LandlordSubHero";

export default async function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 부동산 중개사(REALESTATE)·임대사업자(RENTAL_BIZ)는 사이드바 대신 상단 nav + 서브 히어로로 통일한다.
  // 지도 높이 = 100vh - nav(80) - 서브히어로(200) = calc(100vh - 280px)
  const session = await auth();
  const role = session?.user?.role;
  const isRealtor = role === "REALESTATE";
  const isLandlord = role === "RENTAL_BIZ";
  if (isRealtor || isLandlord) {
    const Gnb = isLandlord ? LandlordGnb : RealtorGnb;
    const SubHero = isLandlord ? LandlordSubHero : RealtorSubHero;
    return (
      <SessionGuard>
        <div className="realtor-theme">
          <Gnb />
          <SubHero />
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
