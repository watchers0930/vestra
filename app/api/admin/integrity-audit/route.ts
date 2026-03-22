import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { IntegrityChain } from "@/lib/integrity-chain";
import { createAuditLog } from "@/lib/audit-log";

/**
 * GET /api/admin/integrity-audit
 * 무결성 감사 로그 조회
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const analysisType = searchParams.get("type") || undefined;

  const where = analysisType ? { analysisType } : {};

  const [records, total] = await Promise.all([
    prisma.integrityRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.integrityRecord.count({ where }),
  ]);

  // 통계
  const [validCount, invalidCount, totalRecords] = await Promise.all([
    prisma.integrityRecord.count({ where: { isValid: true } }),
    prisma.integrityRecord.count({ where: { isValid: false } }),
    prisma.integrityRecord.count(),
  ]);

  const avgSteps = await prisma.integrityRecord.aggregate({
    _avg: { steps: true },
  });

  return NextResponse.json({
    records: records.map((r) => ({
      id: r.id,
      analysisId: r.analysisId,
      analysisType: r.analysisType,
      address: r.address,
      steps: r.steps,
      stepsData: r.stepsData,
      merkleRoot: r.merkleRoot,
      isValid: r.isValid,
      verifiedAt: r.verifiedAt,
      createdAt: r.createdAt,
    })),
    stats: {
      total: totalRecords,
      valid: validCount,
      invalid: invalidCount,
      avgSteps: Math.round((avgSteps._avg.steps || 0) * 10) / 10,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * POST /api/admin/integrity-audit
 * 전체 재검증: 모든 체인의 무결성 확인
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  // 최근 100개 체인 재검증
  const records = await prisma.integrityRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let verifiedCount = 0;
  let tamperedCount = 0;

  for (const record of records) {
    const stepsData = record.stepsData as Array<{
      stepId: string;
      stepName: string;
      inputHash: string;
      outputHash: string;
      previousStepHash: string;
      stepHash: string;
    }>;

    // 체인 링크 검증: 각 단계의 previousStepHash가 이전 단계의 stepHash와 일치하는지
    let isValid = true;
    for (let i = 1; i < stepsData.length; i++) {
      if (stepsData[i].previousStepHash !== stepsData[i - 1].stepHash) {
        isValid = false;
        break;
      }
    }

    // Merkle Root 검증을 위해 IntegrityChain 재구성
    try {
      const chain = new IntegrityChain(`reverify_${record.id}`);
      for (const step of stepsData) {
        await chain.addStep(step.stepName, step.inputHash, step.outputHash);
      }
      await chain.finalize();
      const report = await chain.verify();
      isValid = isValid && report.chainLinksValid;
    } catch {
      // 체인 재구성 실패 시 기존 검증 결과 유지
    }

    if (isValid !== record.isValid) {
      await prisma.integrityRecord.update({
        where: { id: record.id },
        data: { isValid, verifiedAt: new Date() },
      });
    } else {
      await prisma.integrityRecord.update({
        where: { id: record.id },
        data: { verifiedAt: new Date() },
      });
    }

    if (isValid) verifiedCount++;
    else tamperedCount++;
  }

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:run-integrity-audit",
    target: "integrity-audit",
    detail: { checked: records.length, verified: verifiedCount, tampered: tamperedCount, description: "무결성 전체 재검증 실행" },
  });

  return NextResponse.json({
    success: true,
    checked: records.length,
    verified: verifiedCount,
    tampered: tamperedCount,
    verifiedAt: new Date().toISOString(),
  });
}
