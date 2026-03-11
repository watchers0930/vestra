import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptPII } from "@/lib/crypto";

/** GET: 개별 학습 데이터 상세 (복호화된 원문 포함) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { id } = await params;
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
}

/** PUT: 상태 변경 + 파싱 데이터 수정 (리뷰) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { id } = await params;
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

  return NextResponse.json(updated);
}

/** DELETE: 학습 데이터 삭제 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.trainingData.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "데이터를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.trainingData.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
