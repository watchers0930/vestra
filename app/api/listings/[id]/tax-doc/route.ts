import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { put, get } from "@vercel/blob";
import { validateMagicBytes } from "@/lib/sanitize";

// GET /api/listings/[id]/tax-doc — 재산세납부확인서 조회 (인가 프록시)
// private Blob이라 소유자만 이 라우트를 통해서만 열람 가능(공개 URL 없음).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerId: true, taxDocUrl: true, taxDocFilename: true },
    });
    if (!listing) return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    if (listing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (!listing.taxDocUrl) {
      return NextResponse.json({ error: "업로드된 서류가 없습니다." }, { status: 404 });
    }

    // taxDocUrl은 pathname(참조키). private Blob을 서버에서 스트리밍.
    const result = await get(listing.taxDocUrl, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: "서류를 불러올 수 없습니다." }, { status: 404 });
    }
    // 민감 문서 → 브라우저·CDN 캐시 금지. 필요한 헤더만 명시적으로 구성.
    const outHeaders = new Headers();
    outHeaders.set("Content-Type", result.blob.contentType || "application/octet-stream");
    outHeaders.set("Cache-Control", "private, no-store, max-age=0");
    if (listing.taxDocFilename) {
      outHeaders.set(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(listing.taxDocFilename)}`,
      );
    }
    return new NextResponse(result.stream as unknown as ReadableStream, { headers: outHeaders });
  } catch (e) {
    console.error("[GET tax-doc]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/listings/[id]/tax-doc — 재산세납부확인서 업로드
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!listing) return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    if (listing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "PDF, JPG, PNG 파일만 허용됩니다." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 400 });
    }

    // 매직바이트 검증 — MIME 위조 방지(선언 타입과 실제 바이트 일치 확인)
    const buffer = await file.arrayBuffer();
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: "파일이 손상되었거나 형식이 올바르지 않습니다. 정상적인 PDF 또는 이미지(JPG·PNG) 파일인지 확인해주세요." }, { status: 400 });
    }
    // 파일명 길이 제한 (헤더·저장 남용 방지)
    const filename = file.name.slice(0, 200);

    const ext = filename.split(".").pop()?.slice(0, 10) ?? "pdf";
    // S6: 민감 문서 → private Blob. DB에는 공개 URL이 아니라 참조키(pathname)만 저장.
    // 조회는 GET /api/listings/[id]/tax-doc 인가 프록시를 통해서만 가능.
    const blob = await put(
      `listings/tax-doc/${session.user.id}/${id}.${ext}`,
      buffer,
      { access: "private", allowOverwrite: true, contentType: file.type },
    );

    await prisma.listing.update({
      where: { id },
      data: { taxDocUrl: blob.pathname, taxDocFilename: filename },
    });

    return NextResponse.json({ ok: true, filename });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
