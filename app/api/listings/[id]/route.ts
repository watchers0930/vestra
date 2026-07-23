import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { validateOrigin } from "@/lib/csrf";

const patchSchema = z.object({
  listingType: z.enum(["JEONSE", "SALE"]).optional(),
  address: z.string().min(5).optional(),
  roomType: z.string().optional().nullable(),
  size: z.number().positive().optional().nullable(),
  floor: z.number().int().optional().nullable(),
  totalFloor: z.number().int().optional().nullable(),
  deposit: z.number().int().positive().optional(),
  managementFee: z.number().int().min(0).optional().nullable(),
  duration: z.number().int().min(1).max(60).optional().nullable(),
  availableFrom: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "HIDDEN", "CONTRACTED", "COMPLETED"]).optional(),
  photos: z.array(z.string().url()).optional().nullable(),
  analysisId: z.string().optional().nullable(),
});

// GET /api/listings/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, role: true, companyName: true, image: true } },
        _count: { select: { applications: true } },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    }

    // viewCount 비동기 증가
    prisma.listing.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    return NextResponse.json(serializeListing(listing));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// PATCH /api/listings/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.listing.findUnique({ where: { id }, select: { ownerId: true } });
    if (!existing) return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    if (existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
        { status: 400 },
      );
    }

    const { deposit, managementFee, availableFrom, photos, ...rest } = parsed.data;

    const updated = await prisma.listing.update({
      where: { id },
      data: {
        ...rest,
        ...(deposit !== undefined ? { deposit: BigInt(deposit) } : {}),
        ...(managementFee !== undefined
          ? { managementFee: managementFee != null ? BigInt(managementFee) : null }
          : {}),
        ...(availableFrom !== undefined
          ? { availableFrom: availableFrom ? new Date(availableFrom) : null }
          : {}),
        ...(photos !== undefined
          ? { photos: photos != null ? (photos as Prisma.InputJsonValue) : Prisma.DbNull }
          : {}),
      },
      select: { id: true, status: true, updatedAt: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// DELETE /api/listings/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.listing.findUnique({ where: { id }, select: { ownerId: true } });
    if (!existing) return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    if (existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
    }

    await prisma.listing.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeListing(l: any) {
  return {
    ...l,
    deposit: l.deposit?.toString() ?? null,
    managementFee: l.managementFee?.toString() ?? null,
  };
}
