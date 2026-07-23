import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// POST /api/listings/[id]/photos — 사진 업로드 (Vercel Blob)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerId: true, photos: true },
    });
    if (!existing) return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    if (existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "업로드 권한이 없습니다." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일을 선택해주세요." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "JPG, PNG, WEBP만 업로드 가능합니다." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });
    }

    const existing_photos = (existing.photos as string[] | null) ?? [];
    if (existing_photos.length >= 10) {
      return NextResponse.json({ error: "사진은 최대 10장까지 등록 가능합니다." }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const blob = await put(`listings/${id}/${Date.now()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
    });

    const newPhotos = [...existing_photos, blob.url];
    await prisma.listing.update({
      where: { id },
      data: { photos: newPhotos },
    });

    return NextResponse.json({ url: blob.url, photos: newPhotos });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "업로드 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// DELETE /api/listings/[id]/photos — 사진 삭제
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerId: true, photos: true },
    });
    if (!existing) return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    if (existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
    }

    const { url } = await req.json();
    const photos = ((existing.photos as string[] | null) ?? []).filter((p) => p !== url);

    await prisma.listing.update({ where: { id }, data: { photos } });
    return NextResponse.json({ photos });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
