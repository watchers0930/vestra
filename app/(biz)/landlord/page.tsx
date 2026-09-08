import type { Metadata } from "next";
import DashboardClient from "@/app/(app)/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "임대사업자 홈 · VESTRA",
  description: "보유 매물·자산 현황과 분석 이력을 한눈에 관리하는 임대사업자 워크스페이스",
};

// 접근 제어(RENTAL_BIZ 전용)는 (biz)/landlord/layout.tsx에서 서버 판별한다.
// 콘텐츠는 기존 사업자 대시보드(DashboardClient)를 그대로 재사용한다.
export default function LandlordHomePage() {
  return (
    <div
      className="mx-auto"
      style={{ maxWidth: 1200, paddingTop: 40, paddingBottom: 48, paddingLeft: 32, paddingRight: 32 }}
    >
      <DashboardClient />
    </div>
  );
}
