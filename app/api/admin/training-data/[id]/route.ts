import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/with-admin-auth";
import { prisma } from "@/lib/prisma";
import { decryptPII } from "@/lib/crypto";
import { createAuditLog } from "@/lib/audit-log";

/** GET: 개별 학습 데이터 상세 (복호화된 원문 포함) */
export const GET = withAdminAuth<{ id: string }>(async (_req, { session: _session, params }) => {
  const { id } = params;
  const item = await prisma.trainingData.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "데이터를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    ...item,
    rawText: decryptPII(item.rawTextEncrypted),
    rawTextEncrypted: undefined,
    rawTextHash: undefined,
  });
});

/** PUT: 상태 변경 + 파싱 데이터 수정 (리뷰) */
export const PUT = withAdminAuth<{ id: string }>(async (req, { session, params }) => {
  const { id } = params;
  const body = await req.json();
  const { status, parsedData, reviewNotes } = body;

  const validStatuses = ["pending", "reviewed", "approved", "rejected"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "유효하지 않은 상태입니다." }, { status: 400 });
  }

  const existing = await prisma.trainingData.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "데이터를 찾을 수 없습니다." }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (parsedData !== undefined) {
    updateData.parsedData = parsedData;
    // 파싱 데이터 수정 시 건수도 업데이트
    if (parsedData?.gapgu) updateData.gapguCount = parsedData.gapgu.length;
    if (parsedData?.eulgu) updateData.eulguCount = parsedData.eulgu.length;
  }
  if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes;

  const updated = await prisma.trainingData.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      status: true,
      reviewNotes: true,
      gapguCount: true,
      eulguCount: true,
      updatedAt: true,
    },
  });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:update-training-data",
    target: `training-data:${id}`,
    detail: { status, description: "학습 데이터 수정" },
  });

  return NextResponse.json(updated);
});

/** DELETE: 학습 데이터 삭제 */
export const DELETE = withAdminAuth<{ id: string }>(async (req, { session, params }) => {
  const { id } = params;
  const existing = await prisma.trainingData.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "데이터를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.trainingData.delete({ where: { id } });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:delete-training-data",
    target: `training-data:${id}`,
    detail: { description: "학습 데이터 삭제" },
  });

  return NextResponse.json({ success: true });
});
