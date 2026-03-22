import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRegistry } from "@/lib/registry-parser";
import { extractTextFromPDF, normalizeRegistryText, detectRegistryConfidence } from "@/lib/pdf-parser";
import { encryptPII, hashForSearch } from "@/lib/crypto";
import { extractVocabularyFromParsed } from "@/lib/domain-vocabulary";
import { createAuditLog } from "@/lib/audit-log";

/** GET: 학습 데이터 목록 조회 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const where = status && status !== "all" ? { status } : {};

  const [items, total] = await Promise.all([
    prisma.trainingData.findMany({
      where,
      select: {
        id: true,
        status: true,
        sourceFileName: true,
        sourceType: true,
        confidence: true,
        charCount: true,
        gapguCount: true,
        eulguCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.trainingData.count({ where }),
  ]);

  // 상태별 통계 (6개 쿼리 → 2개로 최적화)
  const [statusGroups, avgConfidence] = await Promise.all([
    prisma.trainingData.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.trainingData.aggregate({ _avg: { confidence: true } }),
  ]);

  const statusCounts = statusGroups.reduce<Record<string, number>>((acc, g) => {
    acc[g.status] = g._count._all;
    return acc;
  }, {});
  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    stats: {
      total: totalCount,
      pending: statusCounts["pending"] || 0,
      reviewed: statusCounts["reviewed"] || 0,
      approved: statusCounts["approved"] || 0,
      rejected: statusCounts["rejected"] || 0,
      avgConfidence: Math.round(avgConfidence._avg.confidence || 0),
    },
  });
}

/** POST: 등기부등본 업로드 → 파싱 → 저장 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") || "";

  let rawText = "";
  let sourceFileName = "";
  let sourceType: "pdf" | "text" | "image" = "text";

  if (contentType.includes("multipart/form-data")) {
    // 파일 업로드
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "파일을 업로드해주세요." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "파일 크기가 10MB를 초과합니다." }, { status: 400 });
    }

    sourceFileName = file.name;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isPdf = ext === "pdf" || file.type === "application/pdf";
    const isTxt = ext === "txt" || file.type === "text/plain";

    if (isPdf) {
      sourceType = "pdf";
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await extractTextFromPDF(buffer, file.name);
      rawText = result.text;
    } else if (isTxt) {
      sourceType = "text";
      rawText = await file.text();
    } else {
      return NextResponse.json(
        { error: "PDF 또는 TXT 파일만 업로드할 수 있습니다." },
        { status: 400 },
      );
    }
  } else {
    // JSON 텍스트 직접 입력
    const body = await req.json();
    rawText = body.rawText;
    sourceFileName = body.sourceFileName || "직접입력";
    sourceType = "text";
  }

  if (!rawText?.trim()) {
    return NextResponse.json({ error: "텍스트가 비어있습니다." }, { status: 400 });
  }

  // 정규화 + 신뢰도 검사
  const normalized = normalizeRegistryText(rawText);
  const { confidence } = detectRegistryConfidence(normalized);

  // 중복 검사
  const textHash = hashForSearch(normalized);
  const existing = await prisma.trainingData.findUnique({
    where: { rawTextHash: textHash },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 등록된 문서입니다.", existingId: existing.id },
      { status: 409 },
    );
  }

  // 파싱
  const parsed = parseRegistry(normalized);

  // 암호화하여 저장
  const encrypted = encryptPII(normalized);

  // 도메인 용어 자동 추출 → DomainVocabulary upsert
  const extractedTerms = extractVocabularyFromParsed(parsed, normalized);
  for (const t of extractedTerms) {
    await prisma.domainVocabulary.upsert({
      where: { term: t.term },
      update: { frequency: { increment: 1 } },
      create: { term: t.term, category: t.category, source: "auto_extracted" },
    }).catch(() => {/* 무시 */});
  }

  const record = await prisma.trainingData.create({
    data: {
      rawTextEncrypted: encrypted,
      rawTextHash: textHash,
      parsedData: JSON.parse(JSON.stringify(parsed)),
      sourceFileName,
      sourceType,
      confidence,
      charCount: normalized.length,
      gapguCount: parsed.gapgu.length,
      eulguCount: parsed.eulgu.length,
    },
  });

  createAuditLog({
    req,
    userId: session.user.id,
    action: "admin:create-training-data",
    target: `training-data:${record.id}`,
    detail: { sourceFileName, sourceType, confidence, description: "학습 데이터 업로드" },
  });

  return NextResponse.json({
    id: record.id,
    status: record.status,
    sourceFileName: record.sourceFileName,
    confidence: record.confidence,
    charCount: record.charCount,
    gapguCount: record.gapguCount,
    eulguCount: record.eulguCount,
    parsedData: parsed,
  });
}
