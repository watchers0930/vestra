import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateFeasibilityReportHtml, normalizeFeasibilityReport } from "@/lib/feasibility/report-html";
import type {
  FeasibilityReport,
  MergedProjectContext,
  VerificationResult,
  RationalityItem,
  ChapterOpinion,
  FeasibilityScore,
} from "@/lib/feasibility/feasibility-types";

export async function POST(req: NextRequest) {
  try {
    // 1. Auth + Rate Limit
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;

    const rl = await rateLimit(`feasibility-report:${userId || ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // 2. reportId 검증
    const body = await req.json();
    const reportId = typeof body.reportId === "string" ? body.reportId : undefined;
    const inlineReport = body.report as FeasibilityReport | undefined;

    if (!reportId && !inlineReport) {
      return NextResponse.json(
        { error: "보고서 ID 또는 보고서 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    let report: FeasibilityReport;

    if (inlineReport) {
      report = normalizeFeasibilityReport(inlineReport);
    } else {
      // 3. DB에서 보고서 조회
      const dbReport = await prisma.feasibilityReport.findUnique({
        where: { id: reportId },
        include: { files: true },
      });

      if (!dbReport) {
        return NextResponse.json(
          { error: "보고서를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      // 4. HTML 보고서 생성
      report = {
        id: dbReport.id,
        projectContext: dbReport.mergedContext as unknown as MergedProjectContext,
        verificationResults: dbReport.verificationData as unknown as VerificationResult[],
        rationalityItems: dbReport.rationalityData as unknown as RationalityItem[],
        chapters: dbReport.chapters as unknown as ChapterOpinion[],
        vScore: dbReport.vScoreDetail as unknown as FeasibilityScore,
        metadata: {
          version: "1.0",
          generatedAt: new Date().toISOString(),
          sourceFiles: dbReport.files.map((f) => f.filename),
          disclaimer:
            "본 보고서는 AI 기반 자동 분석 결과로, 투자 결정의 유일한 근거로 사용해서는 안 됩니다. " +
            "전문 감정평가사 또는 신용평가사의 검토를 권장합니다.",
        },
      };
    }

    const html = generateFeasibilityReportHtml(report);

    // HTML 반환 (클라이언트에서 print-to-pdf 또는 html2canvas 사용)
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Feasibility report error:", message);
    return NextResponse.json(
      { error: `보고서 생성 중 오류: ${message}` },
      { status: 500 }
    );
  }
}
