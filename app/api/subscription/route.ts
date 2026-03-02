import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLAN_CONFIG = {
  FREE: { price: 0, dailyLimit: 5, role: "PERSONAL" },
  PRO: { price: 50000, dailyLimit: 50, role: "BUSINESS" },
  BUSINESS: { price: 100000, dailyLimit: 100, role: "REALESTATE" },
} as const;

/** GET: 현재 구독 상태 조회 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  return NextResponse.json(
    subscription || { plan: "FREE", price: 0, status: "active" }
  );
}

/** POST: 구독 생성/변경 (PG 연동 전 — 플랜 변경만) */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const { plan } = await req.json();
  if (!plan || !PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]) {
    return NextResponse.json({ error: "유효하지 않은 플랜" }, { status: 400 });
  }

  const config = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];

  // 구독 upsert
  const subscription = await prisma.subscription.upsert({
    where: { userId: session.user.id },
    update: {
      plan,
      price: config.price,
      status: "active",
      startDate: new Date(),
      endDate: null,
      canceledAt: null,
    },
    create: {
      userId: session.user.id,
      plan,
      price: config.price,
      status: "active",
    },
  });

  // 사용자 역할 + 일일한도 업데이트
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      role: config.role,
      dailyLimit: config.dailyLimit,
    },
  });

  return NextResponse.json(subscription);
}
