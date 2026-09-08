import type { Metadata } from "next";
import LandlordHomeClient from "./LandlordHomeClient";

export const metadata: Metadata = {
  title: "임대사업자 홈 · VESTRA",
  description: "보유 매물·거래·의향서·등기감시를 한눈에 관리하는 임대사업자 워크스페이스",
};

// 접근 제어(RENTAL_BIZ 전용)는 (biz)/landlord/layout.tsx에서 서버 판별한다.
// 콘텐츠는 중개사 홈과 동일한 대시보드 UI(LandlordHomeClient)를 사용한다.
export default function LandlordHomePage() {
  return <LandlordHomeClient />;
}
