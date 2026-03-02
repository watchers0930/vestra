import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET: 알림 설정 조회 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  let setting = await prisma.notificationSetting.findUnique({
    where: { userId: session.user.id },
  });

  // 없으면 기본값 생성
  if (!setting) {
    setting = await prisma.notificationSetting.create({
      data: { userId: session.user.id },
    });
  }

  return NextResponse.json(setting);
}

/** PUT: 알림 설정 변경 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const body = await req.json();
  const allowed = [
    "emailEnabled",
    "kakaoEnabled",
    "priceAlert",
    "analysisReport",
    "systemNotice",
    "marketingEmail",
  ];

  // 허용된 필드만 필터
  const data: Record<string, boolean> = {};
  for (const key of allowed) {
    if (typeof body[key] === "boolean") {
      data[key] = body[key];
    }
  }

  const setting = await prisma.notificationSetting.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  return NextResponse.json(setting);
}
