import { redirect } from "next/navigation";

// 레거시 요금제 페이지(정적·CTA 미연결)는 폐지하고, 신규 회원 구독 SSOT 기반 실제 구독 화면으로
// 일원화한다(설계 §1.2). 플랜×기간 표시·선불 결제·현황/재구독은 /renewal/pricing(MemberSubscribeClient)이
// 담당한다. "요금제" 링크(푸터·사이트맵)는 이 리다이렉트로 그대로 연결된다.
export default function PricingPage() {
  redirect("/renewal/pricing");
}
