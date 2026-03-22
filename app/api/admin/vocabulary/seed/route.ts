import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SEED_VOCABULARY } from "@/lib/domain-vocabulary";
import { createAuditLog } from "@/lib/audit-log";

/** POST: 초기 시드 데이터 일괄 등록 */
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  let created = 0;
  let skipped = 0;

  for (const item of SEED_VOCABULARY) {
    try {
      await prisma.domainVocabulary.upsert({
        where: { term: item.term },
        update: {},
        create: {
          term: item.term,
          category: item.category,
          source: "manual",
          definition: item.definition || null,
        },
      });
      created++;
    } catch {
      skipped++;
    }
  }

  createAuditLog({
    userId: session.user.id,
    action: "admin:seed-vocabulary",
    target: "vocabulary",
    detail: { created, skipped, total: SEED_VOCABULARY.length, description: "도메인 용어 시드 데이터 등록" },
  });

  return NextResponse.json({
    message: `시드 완료: ${created}건 등록, ${skipped}건 건너뜀`,
    created,
    skipped,
    total: SEED_VOCABULARY.length,
  });
}
