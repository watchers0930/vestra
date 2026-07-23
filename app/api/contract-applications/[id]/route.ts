import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { validateOrigin } from "@/lib/csrf";

const patchSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED", "WITHDRAWN"]),
  rejectionReason: z.string().max(300).optional().nullable(),
});

// PATCH /api/contract-applications/[id] — 수락/거절(임대인) or 철회(신청자)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const application = await prisma.contractApplication.findUnique({
      where: { id },
      select: {
        id: true,
        listingId: true,
        applicantId: true,
        status: true,
        listing: { select: { ownerId: true } },
      },
    });
    if (!application) {
      return NextResponse.json({ error: "의향서를 찾을 수 없습니다." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 400 },
      );
    }

    const { status, rejectionReason } = parsed.data;
    const userId = session.user.id;
    const isOwner = application.listing.ownerId === userId;
    const isApplicant = application.applicantId === userId;

    if (status === "WITHDRAWN" && !isApplicant) {
      return NextResponse.json({ error: "본인 의향서만 철회 가능합니다." }, { status: 403 });
    }
    if ((status === "ACCEPTED" || status === "REJECTED") && !isOwner) {
      return NextResponse.json({ error: "임대인만 수락/거절할 수 있습니다." }, { status: 403 });
    }
    if (application.status !== "PENDING") {
      return NextResponse.json({ error: "이미 처리된 의향서입니다." }, { status: 409 });
    }

    const updated = await prisma.contractApplication.update({
      where: { id },
      data: { status, rejectionReason: rejectionReason ?? null },
      select: { id: true, status: true, updatedAt: true },
    });

    // 수락 시 매물 상태를 CONTRACTED로 변경
    if (status === "ACCEPTED") {
      await prisma.listing.update({
        where: { id: application.listingId },
        data: { status: "CONTRACTED" },
      }).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
