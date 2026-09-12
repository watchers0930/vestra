import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { validateOrigin } from "@/lib/csrf";
import { decryptPII, maskBusinessNumber } from "@/lib/crypto";
import { del } from "@vercel/blob";

// 등록자(owner) 공개정보 노출 정책: 사업자 유형만 대표자명·사업자번호 공개(공인중개사법상 게시 의무 정보),
// 개인 임대인은 미노출. 사업자번호는 PII 자동 복호화 대상이나 nested include는 확장이 복호화하지 않으므로
// 여기서 수동 복호화하고, 실패(키 불일치 등)로 v2 암호문이 남으면 노출하지 않는다.
const BIZ_ROLES = new Set(["REALESTATE", "RENTAL_BIZ", "BUSINESS"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeOwner(owner: any) {
  if (!owner) return;
  if (BIZ_ROLES.has(owner.role)) {
    if (owner.businessNumber) {
      const dec = decryptPII(owner.businessNumber);
      // 복호화 실패(v2 잔존)는 노출 차단, 성공분은 서버에서 마스킹(123-45-****)해 완전번호 미전송
      owner.businessNumber = dec.startsWith("v2:") ? null : maskBusinessNumber(dec);
    }
  } else {
    // 개인 등록자: 대표자명·사업자번호 미노출
    owner.representName = null;
    owner.businessNumber = null;
  }
}

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
        owner: {
          select: {
            id: true, name: true, role: true, companyName: true, image: true,
            representName: true, businessNumber: true, verifyStatus: true,
          },
        },
        _count: { select: { applications: true } },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    }

    sanitizeOwner(listing.owner);

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
    const existing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerId: true, photos: true, taxDocUrl: true, safetyDocuments: true },
    });
    if (!existing) return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    if (existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
    }

    await prisma.listing.delete({ where: { id } });

    // 연결된 Blob 정리 (best-effort — 실패해도 매물 삭제는 완료). 고아 blob·민감문서 잔존 방지.
    try {
      // 매물 사진: public store
      const photos = ((existing.photos as string[] | null) ?? []).filter(
        (u) => typeof u === "string" && u.includes("blob.vercel-storage"),
      );
      if (photos.length && process.env.PHOTOS_READ_WRITE_TOKEN) {
        await del(photos, { token: process.env.PHOTOS_READ_WRITE_TOKEN }).catch((e) =>
          console.error("[listing DELETE] 사진 blob 정리 실패:", e instanceof Error ? e.message : e),
        );
      }
      // 재산세·안전서류: private store (pathname 참조키)
      const privateRefs: string[] = [];
      if (existing.taxDocUrl) privateRefs.push(existing.taxDocUrl);
      const docs = existing.safetyDocuments as { url?: string }[] | null;
      if (Array.isArray(docs)) for (const d of docs) if (typeof d?.url === "string" && d.url) privateRefs.push(d.url);
      if (privateRefs.length) {
        await del(privateRefs).catch((e) =>
          console.error("[listing DELETE] 문서 blob 정리 실패:", e instanceof Error ? e.message : e),
        );
      }
    } catch (e) {
      console.error("[listing DELETE] blob 정리 예외:", e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeListing(l: any) {
  // S6: 민감 문서는 공개 응답에서 제외.
  // - taxDocUrl(pathname)은 노출하지 않고 존재여부(hasTaxDoc)만.
  // - safetyDocuments는 파일 참조키(url) 제거하고 표시용 메타(type·filename)만.
  //   조회는 소유자 인가 프록시(GET /api/listings/[id]/tax-doc)로만.
  const { taxDocUrl, safetyDocuments, ...rest } = l;
  return {
    ...rest,
    deposit: l.deposit?.toString() ?? null,
    managementFee: l.managementFee?.toString() ?? null,
    hasTaxDoc: !!taxDocUrl,
    safetyDocuments: Array.isArray(safetyDocuments)
      ? safetyDocuments.map((d: Record<string, unknown>) => ({ type: d?.type ?? null, filename: d?.filename ?? null }))
      : (safetyDocuments ?? null),
  };
}
