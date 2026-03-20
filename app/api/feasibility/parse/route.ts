import { NextRequest, NextResponse } from "next/server";
import { gunzipSync } from "zlib";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { parseDocument } from "@/lib/feasibility/document-parser";

export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "doc", "xlsx", "xls", "csv", "hwp", "hwpx"]);
const FEASIBILITY_GUEST_DAILY_LIMIT_BYPASS =
  process.env.FEASIBILITY_GUEST_DAILY_LIMIT_BYPASS === "true";

/**
 * 단일 파일 파싱 API
 * Vercel 서버리스 body 제한(4.5MB)을 우회하기 위해 파일을 하나씩 처리합니다.
 * 4MB 이상 파일은 클라이언트에서 gzip 압축 후 전송됩니다.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Auth + Rate Limit
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    const rl = await rateLimit(`feasibility-parse:${userId || ip}`, 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const isAdmin = session?.user?.role === "ADMIN";
    if (!isAdmin && !FEASIBILITY_GUEST_DAILY_LIMIT_BYPASS) {
      const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit);
      if (!daily.success) {
        return NextResponse.json(
          { error: "일일 사용 한도를 초과했습니다." },
          { status: 429, headers: rateLimitHeaders(daily) }
        );
      }
    }

    // 2. 파일 추출 (압축/비압축 분기)
    const isCompressed = req.headers.get("x-compressed") === "gzip";
    let buffer: Buffer;
    let filename: string;
    let fileSize: number;

    if (isCompressed) {
      // 클라이언트에서 gzip 압축된 바이너리 업로드
      const compressed = Buffer.from(await req.arrayBuffer());
      buffer = gunzipSync(compressed);
      filename = decodeURIComponent(req.headers.get("x-file-name") || "unknown");
      fileSize = buffer.length;
    } else {
      // 기존 FormData 업로드
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "파일을 업로드해주세요." },
          { status: 400 }
        );
      }

      buffer = Buffer.from(await file.arrayBuffer());
      filename = file.name;
      fileSize = file.size;
    }

    // 3. 파일 검증
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `${filename}: 파일 크기가 10MB를 초과합니다.` },
        { status: 400 }
      );
    }

    const ext = filename.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `${filename}: 지원하지 않는 파일 형식입니다. (PDF, DOCX, XLSX, HWP 지원)` },
        { status: 400 }
      );
    }

    // 4. 문서 파싱
    const parsed = await parseDocument({ buffer, name: filename, size: fileSize });

    // rawText를 제외한 결과 반환 (응답 크기 최소화)
    return NextResponse.json({
      parsed: {
        filename: parsed.filename,
        fileType: parsed.fileType,
        fileSize: parsed.fileSize,
        extractedData: parsed.extractedData,
        rawText: parsed.rawText,
        confidence: parsed.confidence,
        pageCount: parsed.pageCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Feasibility parse error:", message);
    return NextResponse.json(
      { error: `문서 분석 중 오류: ${message}` },
      { status: 500 }
    );
  }
}
