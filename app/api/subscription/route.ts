import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";

const PLAN_CONFIG = {
  FREE: { price: 0, dailyLimit: 5, role: "PERSONAL" },
  PRO: { price: 29900, dailyLimit: 50, role: "BUSINESS" },
  BUSINESS: { price: 99000, dailyLimit: 100, role: "REALESTATE" },
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
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const { plan } = await req.json();
  if (!plan || !PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]) {
    return NextResponse.json({ error: "유효하지 않은 플랜" }, { status: 400 });
  }

  // [보안] PG 결제 연동 전까지 유료 플랜 자가 활성화 금지.
  // 이 경로로 role/dailyLimit을 무결제 승격하면 사업자 권한(REALESTATE 등) 탈취가 가능하므로,
  // 유료 전환은 결제 승인(④단계)에서만 처리한다. 여기서는 FREE 다운그레이드만 허용.
  if (plan !== "FREE") {
    return NextResponse.json(
      { error: "유료 구독은 결제 승인 후 활성화됩니다.", requiresPayment: true },
      { status: 402 }
    );
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
