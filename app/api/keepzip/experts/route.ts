import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CAT_LABEL: Record<string, string> = {
  lawyer: "변호사", judicial: "법무사", tax: "세무사", accountant: "회계사", appraiser: "감정평가사",
};
const LABEL_CAT: Record<string, string> = Object.fromEntries(Object.entries(CAT_LABEL).map(([k, v]) => [v, k]));

/**
 * GET /api/keepzip/experts?category=변호사 — 활성 전문가 목록 (LawyerPartner 기반)
 * Expert 카드 형태로 변환해 반환.
 */
export async function GET(req: NextRequest) {
  try {
    const catParam = req.nextUrl.searchParams.get("category");
    const catKey = catParam ? (LABEL_CAT[catParam] ?? catParam) : null;

    const partners = await prisma.lawyerPartner.findMany({
      where: { active: true, ...(catKey && CAT_LABEL[catKey] ? { category: catKey } : {}) },
      orderBy: { avgRating: "desc" },
      take: 50,
    });

    const experts = partners.map((p) => ({
      id: p.id,
      name: p.name ?? "전문가",
      category: CAT_LABEL[p.category] ?? p.category,
      photoUrl: p.photoUrl ?? null,
      headline: p.headline ?? null,
      specialties: (p.careers ?? []).slice(0, 3),
      experience: (p.careers ?? []).length,
      rating: p.avgRating || 0,
      reviewCount: p.ratingCount,
      consultFee: 99000,
      hourlyFee: p.hourlyFee ?? null,
      available: p.active,
    }));

    return NextResponse.json({ experts });
  } catch (e) {
    console.error("[GET /api/keepzip/experts]", e);
    return NextResponse.json({ experts: [] }, { status: 200 });
  }
}
