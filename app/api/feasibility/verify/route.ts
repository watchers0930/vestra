import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { checkOpenAICostGuard } from "@/lib/openai";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchExternalData, verifyClaims } from "@/lib/feasibility/feasibility-validator";
import { assessRationality, calculateFeasibilityScore } from "@/lib/feasibility/audit-engine";
import { generateChapterOpinions } from "@/lib/feasibility/feasibility-prompts";
import { applyResolvedConflicts } from "@/lib/feasibility/context-merger";
import type { MergedProjectContext, ResolvedConflict } from "@/lib/feasibility/feasibility-types";
import { recordIntegrity } from "@/lib/integrity-recorder";

const FEASIBILITY_GUEST_DAILY_LIMIT_BYPASS =
  process.env.FEASIBILITY_GUEST_DAILY_LIMIT_BYPASS === "true";

export async function POST(req: NextRequest) {
  try {
    // 1. Auth + Rate Limit + Cost Guard (기존 패턴)
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    const rl = await rateLimit(`feasibility-verify:${userId || ip}`, 5);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // Feature flag: allow temporary guest feasibility testing without consuming daily quota.
    // ADMIN은 항상 bypass
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

    if (!isAdmin && !FEASIBILITY_GUEST_DAILY_LIMIT_BYPASS) {
      const costGuard = await checkOpenAICostGuard(ip);
      if (!costGuard.allowed) {
        return NextResponse.json(
          { error: "일일 AI 사용 한도를 초과했습니다. 내일 다시 시도해주세요." },
          { status: 429 }
        );
      }
    }

    // 2. 입력 검증
    const body = await req.json();
    const context = body.context as MergedProjectContext;
    const resolvedConflicts = (body.resolvedConflicts || []) as ResolvedConflict[];

    if (!context?.claims?.length) {
      return NextResponse.json(
        { error: "분석할 데이터가 없습니다. 문서를 먼저 업로드해주세요." },
        { status: 400 }
      );
    }

    // 3. 불일치 해결 적용
    const resolvedContext = resolvedConflicts.length > 0
      ? applyResolvedConflicts(context, resolvedConflicts)
      : context;

    // 4. Stage 2: 외부 데이터 조회 (병렬)
    const externalData = await fetchExternalData(resolvedContext);

    // 5. Stage 2: 주장-검증 수행
    const verifications = verifyClaims(resolvedContext.claims, externalData);

    // 6. Stage 2: 합리성 3단계 판정
    const rationalityItems = assessRationality(verifications);

    // 7. Stage 2: V-Score 산출
    const vScore = calculateFeasibilityScore(rationalityItems);

    // 8. Stage 3: LLM 의견 생성 (심사역 페르소나)
    const chapters = await generateChapterOpinions(
      resolvedContext,
      verifications,
      rationalityItems,
      ip
    );

    // 종합 의견을 vScore에 반영
    const lastChapter = chapters.find((ch) => ch.chapterId === "VI");
    if (lastChapter?.overallReview) {
      vScore.investmentOpinion = lastChapter.overallReview;
    }

    // 9. DB 저장 (Prisma)
    let reportId: string | null = null;

    if (userId) {
      const report = await prisma.feasibilityReport.create({
        data: {
          userId,
          projectName: resolvedContext.projectName,
          address: resolvedContext.location.address,
          purpose: resolvedContext.purpose,
          totalFloorArea: resolvedContext.scale.totalFloorArea,
          totalUnits: resolvedContext.scale.totalUnits,
          mergedContext: resolvedContext as object,
          verificationData: verifications as object[],
          rationalityData: rationalityItems as object[],
          chapters: chapters as object[],
          vScore: vScore.score,
          vScoreGrade: vScore.grade,
          vScoreDetail: vScore as object,
          status: "completed",
        },
      });
      reportId = report.id;

      // 10. 업로드 파일 메타데이터 저장
      if (resolvedContext.sourceFiles?.length) {
        await prisma.feasibilityFile.createMany({
          data: resolvedContext.sourceFiles.map((f) => ({
            reportId: report.id,
            filename: f.filename,
            fileType: f.fileType,
            fileSize: f.fileSize,
            pageCount: f.pageCount,
            confidence: f.confidence,
          })),
        });
      }

      // 11. Analysis 이력 저장 (기존 패턴)
      const analysis = await prisma.analysis.create({
        data: {
          userId,
          type: "feasibility",
          typeLabel: "사업성 분석",
          address: resolvedContext.location.address,
          summary: `사업성 등급: ${vScore.grade} (${vScore.score}점) - ${vScore.gradeLabel}`,
          data: JSON.stringify({ reportId: report.id, vScore }),
        },
      });

      // 12. 무결성 체인 기록
      try {
        await recordIntegrity({
          analysisId: analysis.id,
          analysisType: "feasibility",
          address: resolvedContext.location.address,
          steps: [
            { name: "문서 파싱", input: { fileCount: resolvedContext.sourceFiles.length }, output: { contextKeys: Object.keys(resolvedContext).length } },
            { name: "외부 데이터 검증", input: resolvedContext.location, output: { verificationCount: verifications.length } },
            { name: "합리성 평가", input: { claimCount: verifications.length }, output: { rationalityCount: rationalityItems.length } },
            { name: "AI 챕터 분석", input: { chapters: chapters.length }, output: chapters.map((c) => c.title) },
            { name: "V-Score 산출", input: { grade: vScore.grade }, output: { score: vScore.score } },
          ],
        });
      } catch {
        // 무결성 기록 실패해도 분석 결과는 반환
      }
    }

    return NextResponse.json({
      reportId,
      verifications,
      rationalityItems,
      chapters,
      vScore,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Feasibility verify error:", message);
    return NextResponse.json(
      { error: `검증 분석 중 오류: ${message}` },
      { status: 500 }
    );
  }
}
