import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";

const PHONE_REGEX = /^01[016789]-?\d{3,4}-?\d{4}$/;

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
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const body = await req.json();

  // 허용된 boolean 필드
  const booleanFields = [
    "emailEnabled",
    "kakaoEnabled",
    "smsEnabled",
    "webPushEnabled",
    "registryChangeAlert",
    "priceAlert",
    "analysisReport",
    "systemNotice",
    "marketingEmail",
  ];

  // 허용된 string(전화번호) 필드
  const phoneFields = ["kakaoPhoneNumber", "smsPhoneNumber"];

  const data: Record<string, boolean | string | null> = {};

  // boolean 필드 처리
  for (const key of booleanFields) {
    if (typeof body[key] === "boolean") {
      data[key] = body[key];
    }
  }

  // 전화번호 필드 처리 (서버 검증)
  for (const key of phoneFields) {
    if (key in body) {
      const value = body[key];
      if (value === null || value === "") {
        data[key] = null;
      } else if (typeof value === "string") {
        const cleaned = value.trim();
        if (!PHONE_REGEX.test(cleaned)) {
          return NextResponse.json(
            { error: `올바른 전화번호 형식이 아닙니다: ${key}` },
            { status: 400 }
          );
        }
        data[key] = cleaned;
      }
    }
  }

  const setting = await prisma.notificationSetting.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  return NextResponse.json(setting);
}
