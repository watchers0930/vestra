import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";

type Params = { params: Promise<{ id: string }> };

// GET /api/e-contracts/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const contract = await prisma.eContract.findUnique({
      where: { id },
      include: { signatures: true },
    });
    if (!contract) {
      return NextResponse.json({ error: "계약을 찾을 수 없습니다." }, { status: 404 });
    }

    const userEmail = session.user.email?.toLowerCase() ?? "";
    const isParty =
      contract.landlordId === session.user.id ||
      contract.tenantEmail === userEmail ||
      contract.brokerEmail === userEmail;

    if (!isParty) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    return NextResponse.json({ contract });
  } catch (e) {
    console.error("[GET /api/e-contracts/[id]]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// PATCH /api/e-contracts/[id] — 계약 취소
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const { action } = await req.json();

    const contract = await prisma.eContract.findUnique({ where: { id } });
    if (!contract) {
      return NextResponse.json({ error: "계약을 찾을 수 없습니다." }, { status: 404 });
    }
    if (contract.landlordId !== session.user.id && contract.creatorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (contract.status === "COMPLETED") {
      return NextResponse.json({ error: "완료된 계약은 변경할 수 없습니다." }, { status: 400 });
    }

    if (action === "cancel") {
      await prisma.eContract.update({
        where: { id },
        data: { status: "CANCELED" },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "유효하지 않은 action입니다." }, { status: 400 });
  } catch (e) {
    console.error("[PATCH /api/e-contracts/[id]]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
