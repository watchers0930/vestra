import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { validateMagicBytes } from "@/lib/sanitize";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// 매물 사진 전용 public store 토큰. 누락 시 기본(private) store 오유입 차단.
function photosToken(): string {
  const t = process.env.PHOTOS_READ_WRITE_TOKEN;
  if (!t) throw new Error("PHOTOS_READ_WRITE_TOKEN 미설정 — 매물 사진 store가 연결되지 않았습니다.");
  return t;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "JPG, PNG, WEBP 형식만 지원합니다." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });
    }

    // 매직바이트 검증 — MIME 위조 방지
    const buffer = await file.arrayBuffer();
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: "파일 내용이 형식과 일치하지 않습니다." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.slice(0, 10) ?? "jpg";
    const filename = `listings/temp/${session.user.id}/${Date.now()}.${ext}`;
    // 매물 사진(공개 자산) → public store(vestra-photos). 재산세(private store)와 분리.
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: file.type,
      token: photosToken(),
    });

    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
