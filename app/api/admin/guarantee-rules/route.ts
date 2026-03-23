import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/with-admin-auth";

/** GET — 현재 활성 규칙 + 변경 이력 조회 */
export const GET = withAdminAuth(async () => {
  const [activeRules, history] = await Promise.all([
    prisma.guaranteeRule.findMany({
      where: { isActive: true },
      orderBy: { provider: "asc" },
    }),
    prisma.guaranteeRule.findMany({
      orderBy: [{ provider: "asc" }, { version: "desc" }],
      take: 30,
    }),
  ]);

  return NextResponse.json({ activeRules, history });
});

/** PUT — 규칙 수정 (새 version 생성, 이전 비활성화) */
export const PUT = withAdminAuth(async (req) => {
  const body = await req.json();
  const { provider, rules, changelog, updatedBy } = body;

  if (!provider || !rules) {
    return NextResponse.json({ error: "provider와 rules는 필수입니다" }, { status: 400 });
  }

  if (!["HUG", "HF", "SGI"].includes(provider)) {
    return NextResponse.json({ error: "유효하지 않은 기관입니다" }, { status: 400 });
  }

  // 현재 활성 규칙의 최대 version 조회
  const current = await prisma.guaranteeRule.findFirst({
    where: { provider, isActive: true },
    orderBy: { version: "desc" },
  });

  const nextVersion = current ? current.version + 1 : 1;

  // 트랜잭션: 이전 비활성화 + 새 규칙 생성
  const newRule = await prisma.$transaction(async (tx) => {
    if (current) {
      await tx.guaranteeRule.update({
        where: { id: current.id },
        data: { isActive: false },
      });
    }

    return tx.guaranteeRule.create({
      data: {
        provider,
        rules,
        version: nextVersion,
        isActive: true,
        changelog: changelog || `v${nextVersion} 업데이트`,
        updatedBy: updatedBy || "admin",
      },
    });
  });

  return NextResponse.json({ success: true, rule: newRule });
});
