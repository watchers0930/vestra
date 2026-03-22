import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { gunzipSync } from "zlib";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { parseDocument } from "@/lib/feasibility/document-parser";
import { generateScrReport } from "@/lib/feasibility/scr-orchestrator";
import type { ProjectType } from "@/lib/feasibility/scr-types";
import type { ParsedDocument } from "@/lib/feasibility/feasibility-types";

export const maxDuration = 120;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "doc", "xlsx", "xls", "csv", "hwp", "hwpx"]);
const VALID_PROJECT_TYPES: ProjectType[] = [
  "아파트", "주상복합", "오피스텔", "지식산업센터",
  "재건축", "재개발", "생활형숙박시설",
];

const FEASIBILITY_GUEST_DAILY_LIMIT_BYPASS =
  process.env.FEASIBILITY_GUEST_DAILY_LIMIT_BYPASS === "true";

/**
 * SCR 사업성 분석 보고서 생성 API
 *
 * POST: multipart/form-data (PDF 파일 + projectType + options JSON)
 * 또는 JSON body (이미 파싱된 문서 배열 + projectType + options)
 *
 * 출력: ScrReportData JSON
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Auth + Rate Limit
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    const rl = await rateLimit(`feasibility-scr:${userId || ip}`, 5);
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

    // 2. 입력 분기: multipart/form-data vs JSON
    const contentType = req.headers.get("content-type") || "";
    let parsedDocs: ParsedDocument[];
    let projectType: ProjectType;
    let options: Record<string, unknown> = {};

    if (contentType.includes("multipart/form-data")) {
      // ── FormData: PDF 파일 업로드 + 옵션 ──
      const formData = await req.formData();
      const files = formData.getAll("files") as File[];
      const singleFile = formData.get("file") as File | null;
      const allFiles = singleFile ? [singleFile, ...files] : files;

      if (allFiles.length === 0) {
        return NextResponse.json(
          { error: "파일을 업로드해주세요." },
          { status: 400 }
        );
      }

      // projectType 추출
      const rawProjectType = formData.get("projectType") as string | null;
      projectType = validateProjectType(rawProjectType);

      // options 추출
      const rawOptions = formData.get("options") as string | null;
      if (rawOptions) {
        try {
          options = JSON.parse(rawOptions);
        } catch {
          // options 파싱 실패 시 기본값 사용
        }
      }

      // 파일 검증 + 파싱
      parsedDocs = [];
      for (const file of allFiles) {
        const buffer = Buffer.from(await file.arrayBuffer());

        if (buffer.length > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `${file.name}: 파일 크기가 10MB를 초과합니다.` },
            { status: 400 }
          );
        }

        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
          return NextResponse.json(
            { error: `${file.name}: 지원하지 않는 파일 형식입니다. (PDF, DOCX, XLSX, HWP 지원)` },
            { status: 400 }
          );
        }

        const parsed = await parseDocument({
          buffer,
          name: file.name,
          size: file.size,
        });
        parsedDocs.push(parsed);
      }
    } else if (contentType.includes("application/json")) {
      // ── JSON: 이미 파싱된 문서 배열 ──
      const body = await req.json();

      if (!body.parsedDocs?.length) {
        return NextResponse.json(
          { error: "파싱된 문서 데이터가 없습니다." },
          { status: 400 }
        );
      }

      // parsedDocs 구조 검증
      if (
        !Array.isArray(body.parsedDocs) ||
        !body.parsedDocs.every(
          (d: unknown) =>
            typeof d === "object" &&
            d !== null &&
            "claims" in d &&
            Array.isArray((d as Record<string, unknown>).claims)
        )
      ) {
        return NextResponse.json(
          { error: "parsedDocs 형식이 올바르지 않습니다." },
          { status: 400 }
        );
      }
      parsedDocs = body.parsedDocs as ParsedDocument[];
      projectType = validateProjectType(body.projectType);
      options = body.options || {};
    } else if (req.headers.get("x-compressed") === "gzip") {
      // ── gzip 압축 단일 파일 ──
      const compressed = Buffer.from(await req.arrayBuffer());
      const buffer = gunzipSync(compressed);
      const filename = decodeURIComponent(
        req.headers.get("x-file-name") || "unknown.pdf"
      );

      if (buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `${filename}: 파일 크기가 10MB를 초과합니다.` },
          { status: 400 }
        );
      }

      const ext = filename.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          { error: `${filename}: 지원하지 않는 파일 형식입니다.` },
          { status: 400 }
        );
      }

      const parsed = await parseDocument({
        buffer,
        name: filename,
        size: buffer.length,
      });
      parsedDocs = [parsed];

      const rawPt = req.headers.get("x-project-type");
      projectType = validateProjectType(rawPt);

      const rawOpts = req.headers.get("x-options");
      if (rawOpts) {
        try {
          options = JSON.parse(rawOpts);
        } catch {
          // 무시
        }
      }
    } else {
      return NextResponse.json(
        { error: "지원하지 않는 Content-Type입니다. multipart/form-data 또는 application/json을 사용해주세요." },
        { status: 400 }
      );
    }

    // 3. SCR 보고서 생성
    const report = await generateScrReport({
      parsedDocs,
      projectType,
      options: {
        scenarioSaleRates: options.scenarioSaleRates as number[] | undefined,
        sensitivityChangePercents: options.sensitivityChangePercents as number[] | undefined,
        constructionMonths: options.constructionMonths as number | undefined,
        analyst: options.analyst as string | undefined,
      },
    });

    return NextResponse.json(report);
  } catch (error: unknown) {
    return handleApiError(error, "SCR 보고서 생성");
  }
}

// ─── 유틸 ───

function validateProjectType(raw: string | null | undefined): ProjectType {
  if (raw && VALID_PROJECT_TYPES.includes(raw as ProjectType)) {
    return raw as ProjectType;
  }
  return "아파트"; // 기본값
}
