import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { mergeContexts } from "@/lib/feasibility/context-merger";
import type { ParsedDocument } from "@/lib/feasibility/feasibility-types";

const MAX_FILES = 10;

/**
 * 파싱된 문서 결과들을 병합하는 API
 * parse API에서 파일별로 파싱한 결과(ParsedDocument[])를 받아
 * 컨텍스트 병합 + 불일치 감지를 수행합니다.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;

    const rl = await rateLimit(`feasibility-merge:${userId || ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { parsedDocs } = (await req.json()) as { parsedDocs: ParsedDocument[] };

    if (!parsedDocs?.length) {
      return NextResponse.json(
        { error: "파싱된 문서 데이터가 없습니다." },
        { status: 400 }
      );
    }

    if (parsedDocs.length > MAX_FILES) {
      return NextResponse.json(
        { error: `파일은 최대 ${MAX_FILES}개까지 가능합니다.` },
        { status: 400 }
      );
    }

    const { context, conflicts } = mergeContexts(parsedDocs);

    // rawText 제거하여 응답 크기 최소화
    const sanitizedContext = {
      ...context,
      sourceFiles: context.sourceFiles.map((file) => ({
        filename: file.filename,
        fileType: file.fileType,
        fileSize: file.fileSize,
        extractedData: {},
        rawText: "",
        confidence: file.confidence,
        pageCount: file.pageCount,
      })),
    };

    return NextResponse.json({
      context: sanitizedContext,
      conflicts,
      parsedFiles: parsedDocs.map((d) => ({
        filename: d.filename,
        fileType: d.fileType,
        fileSize: d.fileSize,
        confidence: d.confidence,
        pageCount: d.pageCount,
        extractedCount: Object.keys(d.extractedData).length,
      })),
    });
  } catch (error: unknown) {
    return handleApiError(error, "사업성 병합");
  }
}
