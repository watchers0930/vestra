import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST: 구독 해지 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (!subscription || subscription.plan === "FREE") {
    return NextResponse.json({ error: "해지할 구독이 없습니다" }, { status: 400 });
  }

  // 구독 해지 처리
  await prisma.subscription.update({
    where: { userId: session.user.id },
    data: {
      status: "canceled",
      canceledAt: new Date(),
    },
  });

  // 무료 플랜으로 다운그레이드
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      role: "PERSONAL",
      dailyLimit: 5,
    },
  });

  return NextResponse.json({ message: "구독이 해지되었습니다" });
}
