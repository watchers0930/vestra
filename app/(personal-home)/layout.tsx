import SessionGuard from "@/components/auth/session-guard";
import ExpertPendingGate from "./home/components/ExpertPendingGate";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PersonalHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 전문가 심사 대기(kycStatus="pending") 계정은 개인 영역 전체를 차단하고
  // '심사 진행중' 게이트만 노출한다(서버 판별 → 클라이언트 우회 차단).
  // 대기 상태는 항상 role="PERSONAL"이므로 PERSONAL일 때만 조회한다(불필요 쿼리 방지).
  const session = await auth();
  if (session?.user?.id && session.user.role === "PERSONAL") {
    const partner = await prisma.lawyerPartner.findUnique({
      where: { userId: session.user.id },
      select: { kycStatus: true, category: true },
    });
    if (partner?.kycStatus === "pending") {
      return <ExpertPendingGate category={partner.category} />;
    }
  }

  return <SessionGuard>{children}</SessionGuard>;
}
