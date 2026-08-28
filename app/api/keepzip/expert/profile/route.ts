import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { sanitizeField } from "@/lib/sanitize";
import { isValidImageDataUrl } from "@/lib/keepzip/image-validation";

/**
 * GET   /api/keepzip/expert/profile — 내 전문가 프로필 로드
 * PATCH /api/keepzip/expert/profile — 약력·경력·학교·기타정보·전자직인 저장
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const p = await prisma.lawyerPartner.findUnique({
    where: { userId },
    select: { bio: true, careers: true, schools: true, etcInfo: true, category: true, name: true, stampImageUrl: true, photoUrl: true, headline: true },
  });
  return NextResponse.json({ profile: p });
}

export async function PATCH(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const partner = await prisma.lawyerPartner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return NextResponse.json({ error: "전문가 가입 후 이용 가능합니다." }, { status: 403 });

    const b = await req.json().catch(() => null);
    if (!b || typeof b !== "object") return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

    const data: { bio?: string; etcInfo?: string; careers?: string[]; schools?: string[]; stampImageUrl?: string; photoUrl?: string; headline?: string } = {};
    if (typeof b.bio === "string") data.bio = b.bio.slice(0, 2000);
    if (typeof b.etcInfo === "string") data.etcInfo = b.etcInfo.slice(0, 2000);
    if (Array.isArray(b.careers)) data.careers = b.careers.slice(0, 30).map((x: unknown) => sanitizeField(String(x), 200)).filter(Boolean);
    if (Array.isArray(b.schools)) data.schools = b.schools.slice(0, 30).map((x: unknown) => sanitizeField(String(x), 200)).filter(Boolean);
    // 전자직인 — 이미지 data URL 검증(SVG 차단·크기 상한) 후 저장
    if (typeof b.stampImageUrl === "string" && isValidImageDataUrl(b.stampImageUrl)) data.stampImageUrl = b.stampImageUrl;
    // 프로필 사진 — 이미지 data URL 검증(3MB 상한)
    if (typeof b.photoUrl === "string" && isValidImageDataUrl(b.photoUrl, 3_000_000)) data.photoUrl = b.photoUrl;
    if (typeof b.headline === "string") data.headline = sanitizeField(b.headline, 120);

    await prisma.lawyerPartner.update({ where: { userId }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/keepzip/expert/profile]", e);
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
