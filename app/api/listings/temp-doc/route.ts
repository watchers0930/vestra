import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { validateMagicBytes } from "@/lib/sanitize";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "PDF, JPG, PNG 형식만 지원합니다." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 400 });
    }

    // 매직바이트 검증 — MIME 위조 방지
    const buffer = await file.arrayBuffer();
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: "파일이 손상되었거나 형식이 올바르지 않습니다. 정상적인 PDF 또는 이미지(JPG·PNG·WEBP) 파일인지 확인해주세요." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.slice(0, 10) ?? "pdf";
    const filename = `listings/docs/${session.user.id}/${Date.now()}.${ext}`;
    // S6: 안전서류(재산세납부확인서 등)는 민감 → private Blob.
    // 반환·저장은 공개 URL이 아니라 참조키(pathname). 조회는 인가된 소유자만.
    const blob = await put(filename, buffer, { access: "private", contentType: file.type });

    return NextResponse.json({ url: blob.pathname });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
