/**
 * 서버리스 PDF → 페이지별 이미지(PNG) 렌더
 * ──────────────────────────────────────────────────────────────
 * 스캔 PDF(텍스트 레이어 없음)를 OpenAI OCR에 넘기기 전, 각 페이지를
 * 이미지로 렌더한다. PDF의 `/Rotate` 회전 플래그를 pdfjs가 래스터에
 * 반영하므로, 옆으로 눕힌 스캔도 똑바로 세워져 상단 표(부동산의 표시 등)까지
 * 정확히 판독된다.
 *
 * 배경: 기존 `extractTextFromScannedPDF`는 원본 PDF를 OpenAI Responses API
 * `input_file`로 그대로 넘겼는데, 회전 플래그를 살리지 못해 눕힌 스캔의
 * 상단 표를 통째로 누락했다. 서버 렌더로 회전을 먼저 정규화해 근본 해결한다.
 *
 * 구현: unpdf.renderPageAsImage + @napi-rs/canvas.
 * Vercel 서버리스(linux) 동작은 PoC로 실증 완료(회전 스캔 → 똑바로 렌더).
 * @napi-rs/canvas는 next.config `serverExternalPackages`에 등록되어 있어야 한다.
 *
 * @module lib/pdf-render
 */
import { getDocumentProxy, renderPageAsImage } from "unpdf";

export interface RenderedImage {
  buffer: Buffer;
  mimeType: string;
}

/** 렌더 페이지 수 상한 (과도한 토큰·시간·비용 방지) */
const DEFAULT_MAX_PAGES = 10;
/** 렌더 배율 (약 150dpi 상당 — OCR 판독에 충분하면서 payload 과대 방지) */
const DEFAULT_SCALE = 2;

/**
 * PDF 버퍼를 페이지별 PNG 이미지 배열로 렌더한다.
 * 렌더 실패(예: 네이티브 canvas 미로드)나 페이지 0개면 throw → 호출측이 폴백을 결정.
 */
export async function renderPdfToImages(
  buffer: Buffer,
  options?: { scale?: number; maxPages?: number },
): Promise<RenderedImage[]> {
  const scale = options?.scale ?? DEFAULT_SCALE;
  const maxPages = options?.maxPages ?? DEFAULT_MAX_PAGES;

  // pdfjs가 입력 TypedArray의 buffer를 detach 하므로 복사본을 넘긴다.
  const data = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(data);
  const pageCount = Math.min(pdf.numPages, maxPages);

  const images: RenderedImage[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const png = await renderPageAsImage(pdf, i, {
      scale,
      canvasImport: () => import("@napi-rs/canvas"),
    });
    images.push({ buffer: Buffer.from(png), mimeType: "image/png" });
  }

  if (images.length === 0) {
    throw new Error("PDF 페이지를 렌더하지 못했습니다.");
  }
  return images;
}
