import MemberSubscribeClient from "./MemberSubscribeClient";

export const metadata = {
  title: "요금제 - VESTRA",
  description: "베스트라 회원 구독 — 플랜과 이용 기간을 선택해 선불로 구독하세요",
};

export default function PricingPage() {
  return <MemberSubscribeClient />;
}
