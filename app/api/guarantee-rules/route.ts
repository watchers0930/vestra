import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_GUARANTEE_RULES } from "@/lib/guarantee-insurance";
import type { GuaranteeRules } from "@/lib/guarantee-insurance";

/** GET — 활성 규칙 조회 (사용자 전세 분석용, DB 우선 → fallback 기본 상수) */
export async function GET() {
  try {
    const dbRules = await prisma.guaranteeRule.findMany({
      where: { isActive: true },
      orderBy: { provider: "asc" },
    });

    if (dbRules.length === 0) {
      return NextResponse.json(DEFAULT_GUARANTEE_RULES);
    }

    // DB 규칙을 GuaranteeRules 형태로 병합
    const merged: GuaranteeRules = { ...DEFAULT_GUARANTEE_RULES };
    for (const row of dbRules) {
      const provider = row.provider as keyof GuaranteeRules;
      if (provider in merged) {
        merged[provider] = { ...merged[provider], ...(row.rules as Record<string, unknown>) } as never;
      }
    }

    return NextResponse.json(merged);
  } catch {
    // DB 연결 실패 시 기본 상수 반환
    return NextResponse.json(DEFAULT_GUARANTEE_RULES);
  }
}
