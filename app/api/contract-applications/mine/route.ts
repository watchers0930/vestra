import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/contract-applications/mine — 내가 보낸 의향서 목록
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const applications = await prisma.contractApplication.findMany({
      where: {
        applicantId: session.user.id,
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
            photos: true,
            status: true,
            owner: { select: { name: true, companyName: true } },
          },
        },
      },
    });

    const serialized = applications.map((a) => ({
      ...a,
      proposedDeposit: a.proposedDeposit?.toString() ?? null,
      moveInDate: a.moveInDate.toISOString(),
      createdAt: a.createdAt.toISOString(),
      listing: a.listing
        ? { ...a.listing, deposit: a.listing.deposit?.toString() ?? null }
        : null,
    }));

    return NextResponse.json({ applications: serialized });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
