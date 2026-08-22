import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";
import { KeepzipCdPdf } from "@/lib/pdf/keepzip-cd-template";

/**
 * POST /api/keepzip/pdf — 내용증명 초안 + 발신인 손글씨 서명을 PDF로 합성 (설계서 §8.1)
 * 흐름: validateOrigin → auth(로그인 필수) → rateLimit → 입력 검증 → renderToBuffer
 */
export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const rl = await rateLimit(`keepzip-pdf:${userId}`, 20);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const title = sanitizeField(String(body.title ?? ""), 200);
    const senderName = sanitizeField(String(body.senderName ?? ""), 100);
    const content = String(body.content ?? "").slice(0, 20000);
    const lawyerName = sanitizeField(String(body.lawyerName ?? ""), 100) || undefined;
    // 서명·직인은 data:image/ PNG data URL만 허용 (그 외 무시)
    const isDataImg = (v: unknown): v is string => typeof v === "string" && v.startsWith("data:image/");
    const signature = isDataImg(body.signature) ? body.signature : undefined;
    const stamp = isDataImg(body.stamp) ? body.stamp : undefined;

    if (!title || !content.trim()) {
      return NextResponse.json({ error: "문서 제목과 내용이 필요합니다." }, { status: 400 });
    }

    const now = new Date();
    const date = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

    const pdfBuffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(KeepzipCdPdf, { data: { title, content, senderName, signature, date, lawyerName, stamp } }) as any
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="keepzip-notice.pdf"`,
        "Content-Length": String(pdfBuffer.byteLength),
      },
    });
  } catch (e) {
    console.error("[POST /api/keepzip/pdf]", e);
    return NextResponse.json({ error: "PDF 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
