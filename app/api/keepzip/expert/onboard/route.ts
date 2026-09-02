import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";

const CATEGORIES = ["lawyer", "judicial", "tax", "accountant", "appraiser"];

/**
 * POST /api/keepzip/expert/onboard — 전문가 가입 신청 저장 (설계서 §6 lawyer/onboard)
 * 로그인 사용자에 LawyerPartner 생성(심사 대기). 사업자등록번호·자격 등록번호 필수.
 */
export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "로그인 후 전문가 가입이 가능합니다." }, { status: 401 });
    }

    const rl = await rateLimit(`keepzip-onboard:${userId}`, 10);
    if (!rl.success) {
      return NextResponse.json({ error: "요청 한도 초과. 잠시 후 다시 시도해주세요." }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const b = await req.json().catch(() => null);
    if (!b || typeof b !== "object") return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

    const category = String(b.category ?? "");
    if (!CATEGORIES.includes(category)) return NextResponse.json({ error: "전문 분야를 선택해주세요." }, { status: 400 });

    const name = sanitizeField(String(b.name ?? ""), 100);
    const phone = sanitizeField(String(b.phone ?? ""), 30);
    const officePhone = sanitizeField(String(b.officePhone ?? ""), 30);
    const office = sanitizeField(String(b.office ?? ""), 200);
    const bizNo = sanitizeField(String(b.bizNo ?? ""), 30);
    const licenseNo = sanitizeField(String(b.licenseNo ?? ""), 50);

    if (!name) return NextResponse.json({ error: "성명을 입력해주세요." }, { status: 400 });
    if (!bizNo) return NextResponse.json({ error: "사업자등록번호는 필수입니다." }, { status: 400 });
    if (!licenseNo) return NextResponse.json({ error: "자격 등록번호는 필수입니다." }, { status: 400 });

    const slug = `${category}-${userId.slice(-6)}`;

    const partner = await prisma.lawyerPartner.upsert({
      where: { userId },
      create: {
        userId, category, name, phone, officePhone, firmName: office, bizNo, licenseNo,
        homepageSlug: slug, kycStatus: "pending", membershipStatus: "inactive",
      },
      update: { category, name, phone, officePhone, firmName: office, bizNo, licenseNo },
    });

    return NextResponse.json({ ok: true, id: partner.id, status: partner.kycStatus });
  } catch (e) {
    console.error("[POST /api/keepzip/expert/onboard]", e);
    return NextResponse.json({ error: "가입 신청 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
