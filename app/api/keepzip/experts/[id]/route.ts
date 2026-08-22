import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CAT_LABEL: Record<string, string> = {
  lawyer: "변호사", judicial: "법무사", tax: "세무사", accountant: "회계사", appraiser: "감정평가사",
};

type Params = { params: Promise<{ id: string }> };

/** GET /api/keepzip/experts/[id] — 전문가 미니홈페이지용 상세(프로필 포함) */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const p = await prisma.lawyerPartner.findFirst({ where: { id, active: true } });
    if (!p) return NextResponse.json({ error: "전문가를 찾을 수 없습니다." }, { status: 404 });

    return NextResponse.json({
      expert: {
        id: p.id,
        name: p.name ?? "전문가",
        category: CAT_LABEL[p.category] ?? p.category,
        firmName: p.firmName ?? "",
        bio: p.bio ?? "",
        careers: p.careers ?? [],
        schools: p.schools ?? [],
        etcInfo: p.etcInfo ?? "",
        specialties: (p.careers ?? []).slice(0, 3),
        experience: (p.careers ?? []).length,
        rating: p.avgRating || 0,
        reviewCount: p.ratingCount,
      },
    });
  } catch (e) {
    console.error("[GET /api/keepzip/experts/[id]]", e);
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
