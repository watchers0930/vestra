import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** localStorage에서 DB로 분석 이력/자산 마이그레이션 (첫 로그인 시 1회) */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { analyses, assets } = await req.json();
  let migratedAnalyses = 0;
  let migratedAssets = 0;

  // 분석 이력 마이그레이션
  if (Array.isArray(analyses)) {
    for (const a of analyses.slice(0, 50)) {
      try {
        await prisma.analysis.create({
          data: {
            userId: session.user.id,
            type: a.type || "unknown",
            typeLabel: a.typeLabel || "",
            address: a.address || "",
            summary: a.summary || "",
            data: typeof a.data === "string" ? a.data : JSON.stringify(a.data || {}),
          },
        });
        migratedAnalyses++;
      } catch {
        // 중복 등 무시
      }
    }
  }

  // 자산 마이그레이션
  if (Array.isArray(assets)) {
    for (const a of assets.slice(0, 20)) {
      try {
        await prisma.asset.upsert({
          where: {
            userId_address: {
              userId: session.user.id,
              address: a.address || "",
            },
          },
          update: {
            estimatedPrice: a.estimatedPrice || 0,
            jeonsePrice: a.jeonsePrice || null,
            safetyScore: a.safetyScore || 0,
            riskScore: a.riskScore || 0,
          },
          create: {
            userId: session.user.id,
            address: a.address || "",
            type: a.type || "아파트",
            estimatedPrice: a.estimatedPrice || 0,
            jeonsePrice: a.jeonsePrice || null,
            safetyScore: a.safetyScore || 0,
            riskScore: a.riskScore || 0,
          },
        });
        migratedAssets++;
      } catch {
        // 중복 등 무시
      }
    }
  }

  return NextResponse.json({ migratedAnalyses, migratedAssets });
}
