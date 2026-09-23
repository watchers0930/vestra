/**
 * [임시 PoC] 서버리스(Vercel)에서 PDF→이미지 렌더 가능성 실증용 라우트.
 *
 * 목적: unpdf.renderPageAsImage + @napi-rs/canvas 가 Vercel linux 서버리스
 * 런타임에서 실제로 동작하는지 확인한다. 렌더 성공 여부·PNG 바이트 크기·
 * 페이지 회전값만 반환하고 이미지 자체는 반환하지 않는다(PII·용량 방지).
 *
 * ⚠️ 검증 후 반드시 제거할 임시 라우트다. 공개 남용 방지를 위해 토큰을 요구한다.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const POC_TOKEN = "vestra-poc-2026-canvas-render";

export async function POST(req: NextRequest) {
  const started = Date.now();
  if (new URL(req.url).searchParams.get("k") !== POC_TOKEN) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file 없음" }, { status: 400 });
    }

    const ab = await file.arrayBuffer();
    // pdfjs가 TypedArray buffer를 detach 하므로 용도별로 복사본을 만든다.
    const forProxy = new Uint8Array(ab.slice(0));
    const forRender = new Uint8Array(ab.slice(0));

    const { renderPageAsImage, getDocumentProxy } = await import("unpdf");

    // 페이지 수·회전 플래그 확인
    let numPages: number | null = null;
    let pageRotate: number | null = null;
    try {
      const pdf = await getDocumentProxy(forProxy);
      numPages = pdf.numPages;
      const page = await pdf.getPage(1);
      pageRotate = (page as { rotate?: number }).rotate ?? null;
    } catch (e) {
      return NextResponse.json({
        ok: false,
        stage: "getDocumentProxy",
        error: String(e instanceof Error ? e.message : e),
      }, { status: 500 });
    }

    // 핵심: 서버리스에서 canvas 렌더가 되는가
    const png = await renderPageAsImage(forRender, 1, {
      scale: 2,
      canvasImport: () => import("@napi-rs/canvas"),
    });

    return NextResponse.json({
      ok: true,
      pngBytes: png.byteLength,
      numPages,
      pageRotate,
      ms: Date.now() - started,
      note: "서버리스 PDF→PNG 렌더 성공",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      stage: "renderPageAsImage",
      error: String(e instanceof Error ? e.message : e),
      stack: e instanceof Error ? e.stack?.split("\n").slice(0, 5) : undefined,
      ms: Date.now() - started,
    }, { status: 500 });
  }
}
