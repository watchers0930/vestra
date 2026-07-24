import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { put } from "@vercel/blob";

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

    const ext = file.name.split(".").pop() ?? "pdf";
    const blob = await put(
      `listings/tax-doc/${session.user.id}/${id}.${ext}`,
      file,
      { access: "public" },
    );

    await prisma.listing.update({
      where: { id },
      data: { taxDocUrl: blob.url, taxDocFilename: file.name },
    });

    return NextResponse.json({ url: blob.url, filename: file.name });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
