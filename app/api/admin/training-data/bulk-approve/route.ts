import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST: 대기/검토 상태 데이터 일괄 승인 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const minConfidence = body.minConfidence ?? 0; // 최소 신뢰도 필터 (기본: 전부)

  const result = await prisma.trainingData.updateMany({
    where: {
      status: { in: ["pending", "reviewed"] },
      confidence: { gte: minConfidence },
    },
    data: {
      status: "approved",
      reviewNotes: `일괄 승인 (${new Date().toLocaleDateString("ko-KR")}, 최소 신뢰도: ${minConfidence}%)`,
    },
  });

  return NextResponse.json({
    approved: result.count,
    message: `${result.count}건 일괄 승인 완료`,
  });
}
