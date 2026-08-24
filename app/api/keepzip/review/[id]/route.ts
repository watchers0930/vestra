import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/keepzip/review/[id] — 변호사 승인·전자직인 (설계서 §6·§9)
 * body: { decision: "approved"|"rejected", stamp?: dataURL }
 * approved → KeepzipCase.status=lawyer_approved + stampUrl 저장, LawyerReview 기록
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    // 전문가(변호사) 본인만
    const partner = await prisma.lawyerPartner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return NextResponse.json({ error: "전문가만 검수할 수 있습니다." }, { status: 403 });

    const { id } = await params;
    const kzCase = await prisma.keepzipCase.findUnique({ where: { id }, select: { id: true, status: true, lawyerId: true } });
    if (!kzCase) return NextResponse.json({ error: "사건을 찾을 수 없습니다." }, { status: 404 });
    // 본인에게 배정된 사건만 검수 가능
    if (kzCase.lawyerId !== partner.id) return NextResponse.json({ error: "배정된 사건만 검수할 수 있습니다." }, { status: 403 });

    const b = await req.json().catch(() => null);
    const decision = b?.decision === "rejected" ? "rejected" : "approved";
    const stamp = typeof b?.stamp === "string" && b.stamp.startsWith("data:image/") ? b.stamp : null;

    if (decision === "approved") {
      await prisma.$transaction([
        prisma.keepzipCase.update({
          where: { id },
          data: { status: "lawyer_approved", stampUrl: stamp },
        }),
        prisma.lawyerReview.upsert({
          where: { caseId: id },
          create: { caseId: id, lawyerId: partner.id, decision: "approved", stampedAt: new Date() },
          update: { decision: "approved", stampedAt: new Date() },
        }),
      ]);
      return NextResponse.json({ ok: true, status: "lawyer_approved" });
    }

    // 반려 → draft 복귀(발송 전 환불 대상)
    await prisma.$transaction([
      prisma.keepzipCase.update({ where: { id }, data: { status: "canceled" } }),
      prisma.lawyerReview.upsert({
        where: { caseId: id },
        create: { caseId: id, lawyerId: partner.id, decision: "rejected" },
        update: { decision: "rejected" },
      }),
    ]);
    return NextResponse.json({ ok: true, status: "canceled" });
  } catch (e) {
    console.error("[PATCH /api/keepzip/review/[id]]", e);
    return NextResponse.json({ error: "검수 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
