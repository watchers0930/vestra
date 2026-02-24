/**
 * VESTRA DB 기반 저장소
 * ─────────────────────
 * Prisma를 사용한 서버사이드 데이터 영속성 레이어.
 * 인증된 사용자의 분석 이력과 자산 정보를 DB에 저장.
 */

import { prisma } from "./prisma";

// ─── 분석 이력 ───

export async function getAnalysesFromDB(userId: string) {
  const records = await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return records.map((r) => ({
    id: r.id,
    type: r.type as "rights" | "contract" | "prediction" | "jeonse" | "registry",
    typeLabel: r.typeLabel,
    address: r.address,
    summary: r.summary,
    date: r.createdAt.toISOString(),
    data: JSON.parse(r.data) as Record<string, unknown>,
  }));
}

export async function addAnalysisToDB(
  userId: string,
  record: {
    type: string;
    typeLabel: string;
    address: string;
    summary: string;
    data: Record<string, unknown>;
  }
) {
  const created = await prisma.analysis.create({
    data: {
      userId,
      type: record.type,
      typeLabel: record.typeLabel,
      address: record.address,
      summary: record.summary,
      data: JSON.stringify(record.data),
    },
  });

  return {
    id: created.id,
    type: created.type as "rights" | "contract" | "prediction" | "jeonse" | "registry",
    typeLabel: created.typeLabel,
    address: created.address,
    summary: created.summary,
    date: created.createdAt.toISOString(),
    data: JSON.parse(created.data) as Record<string, unknown>,
  };
}

// ─── 자산 관리 ───

export async function getAssetsFromDB(userId: string) {
  const assets = await prisma.asset.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return assets.map((a) => ({
    id: a.id,
    address: a.address,
    type: a.type,
    estimatedPrice: a.estimatedPrice,
    jeonsePrice: a.jeonsePrice ?? undefined,
    safetyScore: a.safetyScore,
    riskScore: a.riskScore,
    lastAnalyzedDate: a.lastAnalyzedDate.toISOString(),
    priceHistory: a.priceHistory ? JSON.parse(a.priceHistory) : undefined,
  }));
}

export async function addOrUpdateAssetToDB(
  userId: string,
  asset: {
    address: string;
    type: string;
    estimatedPrice: number;
    jeonsePrice?: number;
    safetyScore: number;
    riskScore: number;
  }
) {
  return prisma.asset.upsert({
    where: {
      userId_address: { userId, address: asset.address },
    },
    update: {
      type: asset.type,
      estimatedPrice: asset.estimatedPrice,
      jeonsePrice: asset.jeonsePrice,
      safetyScore: asset.safetyScore,
      riskScore: asset.riskScore,
      lastAnalyzedDate: new Date(),
    },
    create: {
      userId,
      address: asset.address,
      type: asset.type,
      estimatedPrice: asset.estimatedPrice,
      jeonsePrice: asset.jeonsePrice,
      safetyScore: asset.safetyScore,
      riskScore: asset.riskScore,
    },
  });
}

export async function removeAssetFromDB(userId: string, assetId: string) {
  await prisma.asset.deleteMany({
    where: { id: assetId, userId },
  });
}
