import ExpertClient from "@/app/(personal-home)/renewal/expert/ExpertClient";

export const metadata = {
  title: "전문가 연결 - VESTRA",
  description: "부동산 전문가와 1:1 상담을 연결해 드립니다",
};

// 사업자(중개사·임대사업자)도 개인회원과 동일한 전문가 연결 플로우를 사용한다.
// GNB·서브히어로·푸터는 (app) 레이아웃(RealtorGnb·RealtorSubHero·RealtorFooter)이 제공하므로
// ExpertClient는 embedded 모드로 콘텐츠(분야선택→전문가목록→상담신청 3단계)만 렌더한다.
export default function ExpertConnectPage() {
  return <ExpertClient embedded />;
}
