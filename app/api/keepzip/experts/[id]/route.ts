import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CAT_LABEL: Record<string, string> = {
  lawyer: "변호사", judicial: "법무사", tax: "세무사", accountant: "회계사", appraiser: "감정평가사",
};

// 내용증명 종류 라벨 (진행중 사건 익명 요약용)
const KZ_CAUSE: Record<string, string> = {
  deposit_return: "보증금 반환청구",
  terminate_by_tenant: "계약해지(임차인)",
  terminate_by_landlord: "계약해지(임대인)",
  rent_arrears: "월세 청구",
  maintenance_arrears: "관리비 납부요청",
};
// 처리 완료로 볼 상태 (변호사 검토·직인 후 발송된 사건. 접수·대기·취소 제외)
const DONE_STATUS = ["postal_sent", "delivered", "returned", "closed", "unresponded", "payment_order", "litigation", "public_notice"];

type Params = { params: Promise<{ id: string }> };

/** GET /api/keepzip/experts/[id] — 전문가 미니홈페이지용 상세(프로필 포함) */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const p = await prisma.lawyerPartner.findFirst({ where: { id, active: true } });
    if (!p) return NextResponse.json({ error: "전문가를 찾을 수 없습니다." }, { status: 404 });

    // 항목별 후기 평점 집계(전문성·응답·소통·결과·비용). 후기 없으면 null.
    const agg = await prisma.lawyerRating.aggregate({
      where: { lawyerId: id },
      _avg: { scoreExpertise: true, scoreResponse: true, scoreCommunication: true, scoreResult: true, scoreValue: true },
      _count: { _all: true },
    });
    const ratingBreakdown = agg._count._all > 0 ? {
      count: agg._count._all,
      expertise: agg._avg.scoreExpertise ?? 0,
      response: agg._avg.scoreResponse ?? 0,
      communication: agg._avg.scoreCommunication ?? 0,
      result: agg._avg.scoreResult ?? 0,
      value: agg._avg.scoreValue ?? 0,
    } : null;

    // 처리 완료 사건 — 개인정보 보호를 위해 당사자·내용 없이 "종류별 건수"만 익명 집계
    const grouped = await prisma.keepzipCase.groupBy({
      by: ["cause"],
      where: { lawyerId: id, status: { in: DONE_STATUS } },
      _count: { _all: true },
    });
    const completedCases = grouped
      .map((g) => ({ cause: KZ_CAUSE[g.cause] ?? g.cause, count: g._count._all }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      expert: {
        id: p.id,
        name: p.name ?? "전문가",
        category: CAT_LABEL[p.category] ?? p.category,
        photoUrl: p.photoUrl ?? null,
        headline: p.headline ?? "",
        firmName: p.firmName ?? "",
        bio: p.bio ?? "",
        careers: p.careers ?? [],
        schools: p.schools ?? [],
        etcInfo: p.etcInfo ?? "",
        specialties: (p.careers ?? []).slice(0, 3),
        experience: (p.careers ?? []).length,
        rating: p.avgRating || 0,
        reviewCount: p.ratingCount,
        ratingBreakdown,
        completedCases,
      },
    });
  } catch (e) {
    console.error("[GET /api/keepzip/experts/[id]]", e);
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
