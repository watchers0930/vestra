import PersonalHomeClient from "./PersonalHomeClient";
import ExpertPendingGate from "./components/ExpertPendingGate";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "VESTRA - AI 기반 부동산 권리분석 플랫폼",
  description: "보이지 않는 위험까지 감지하는 부동산 권리분석 AI 플랫폼 VESTRA",
};

export default async function PersonalHomePage() {
  const session = await auth();
  const userId = session?.user?.id;

  // 전문가 심사 대기(kycStatus="pending") 계정은 승인 전까지 홈 대신 차단 게이트만 노출한다.
  // 서버에서 판별해 클라이언트 우회를 차단한다.
  if (userId) {
    const partner = await prisma.lawyerPartner.findUnique({
      where: { userId },
      select: { kycStatus: true, category: true },
    });
    if (partner?.kycStatus === "pending") {
      return <ExpertPendingGate category={partner.category} />;
    }
  }

  return <PersonalHomeClient />;
}
