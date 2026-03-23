import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/with-admin-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";

/** POST: 대기/검토 상태 데이터 일괄 승인 */
export const POST = withAdminAuth(async (req: NextRequest, { session }) => {
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

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:bulk-approve-training-data",
    target: "training-data",
    detail: { approved: result.count, minConfidence, description: "학습 데이터 일괄 승인" },
  });

  return NextResponse.json({
    approved: result.count,
    message: `${result.count}건 일괄 승인 완료`,
  });
});
