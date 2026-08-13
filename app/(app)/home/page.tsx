import { AuthGuard } from "@/components/auth/AuthGuard";
import PersonalHomeClient from "./PersonalHomeClient";

export const metadata = {
  title: "홈 | VESTRA",
  description: "VESTRA 개인 회원 메인 홈 — 안심 매물 탐색, 지역 검색, 전문가 상담",
};

export default function PersonalHomePage() {
  return (
    <AuthGuard featureName="홈">
      <PersonalHomeClient />
    </AuthGuard>
  );
}
