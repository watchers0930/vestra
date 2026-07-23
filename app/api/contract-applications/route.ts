import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { validateOrigin } from "@/lib/csrf";

const createSchema = z.object({
  listingId: z.string().min(1),
  moveInDate: z.string().refine((v) => {
    const d = new Date(v);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !isNaN(d.getTime()) && d >= today;
  }, "입주 희망일은 오늘 이후 날짜여야 합니다."),
  duration: z.number().int().min(1).max(36).optional().nullable(),
  memo: z.string().max(500).optional().nullable(),
  proposedDeposit: z.number().int().min(0).optional().nullable(),
});

// GET /api/contract-applications?owner=me — 임대인: 내 매물로 온 의향서
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status"); // PENDING | ACCEPTED | REJECTED

    const applications = await prisma.contractApplication.findMany({
      where: {
        listing: { ownerId: session.user.id },
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        listingId: true,
        moveInDate: true,
        duration: true,
        memo: true,
        proposedDeposit: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        listing: {
          select: {
            address: true,
            listingType: true,
            deposit: true,
          },
        },
        applicant: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ applications: applications.map(serialize) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/contract-applications — 임차인/매수인: 의향서 제출
export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 400 },
      );
    }

    const { listingId, moveInDate, duration, memo, proposedDeposit } = parsed.data;

    // 매물 존재 및 활성 확인
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, status: true, ownerId: true },
    });
    if (!listing || listing.status !== "ACTIVE") {
      return NextResponse.json({ error: "현재 계약 가능한 매물이 아닙니다." }, { status: 422 });
    }
    if (listing.ownerId === session.user.id) {
      return NextResponse.json({ error: "본인 매물에는 의향서를 제출할 수 없습니다." }, { status: 422 });
    }

    // PENDING 중복 방지
    const duplicate = await prisma.contractApplication.findFirst({
      where: { listingId, applicantId: session.user.id, status: "PENDING" },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: "이미 진행 중인 의향서가 있습니다." }, { status: 409 });
    }

    const application = await prisma.contractApplication.create({
      data: {
        listingId,
        applicantId: session.user.id,
        moveInDate: new Date(moveInDate),
        duration: duration ?? null,
        memo: memo ?? null,
        proposedDeposit: proposedDeposit != null ? BigInt(proposedDeposit) : null,
      },
      select: { id: true, status: true, createdAt: true },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(a: any) {
  return {
    ...a,
    proposedDeposit: a.proposedDeposit?.toString() ?? null,
    moveInDate: a.moveInDate instanceof Date ? a.moveInDate.toISOString() : a.moveInDate,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    listing: a.listing
      ? { ...a.listing, deposit: a.listing.deposit?.toString() ?? null }
      : null,
  };
}
