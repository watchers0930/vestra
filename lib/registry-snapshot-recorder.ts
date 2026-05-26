/**
 * 등기부 스냅샷 DB 기록/검증 모듈
 * ──────────────────────────────────
 * integrity-recorder.ts 패턴을 따르는 DB 접근 전담 모듈.
 * 핵심 로직은 registry-blockchain.ts에 위임.
 */

import { prisma } from "@/lib/prisma";
import {
  createSnapshot,
  verifySnapshotChain,
  getChangedSectionNames,
  type SectionHashes,
} from "@/lib/registry-blockchain";

// ── 타입 ──

interface RecordResult {
  snapshotHash: string;
  sequenceNo: number;
  changedSections: string[]; // 변동된 섹션 이름 (예: ["eulgu"])
  isFirstSnapshot: boolean;
}

// ── 스냅샷 기록 ──

/**
 * 등기부 전문으로 블록체인 스냅샷을 생성하고 DB에 저장
 *
 * 1. 최신 스냅샷 조회 (이전 해시 + sequenceNo)
 * 2. createSnapshot → 머클트리 + 해시체인 + 서명 + 암호화
 * 3. DB 저장
 * 4. 섹션 변동 반환
 */
export async function recordRegistrySnapshot(params: {
  propertyId: string;
  fullText: string;
}): Promise<RecordResult> {
  const { propertyId, fullText } = params;

  // 최신 스냅샷 조회
  const latest = await prisma.registrySnapshot.findFirst({
    where: { monitoredPropertyId: propertyId },
    orderBy: { sequenceNo: "desc" },
    select: {
      sequenceNo: true,
      snapshotHash: true,
      sectionHashes: true,
    },
  });

  const sequenceNo = latest ? latest.sequenceNo + 1 : 1;
  const previousSnapshotHash = latest?.snapshotHash ?? null;

  // 스냅샷 생성
  const snapshot = await createSnapshot({
    monitoredPropertyId: propertyId,
    fullText,
    sequenceNo,
    previousSnapshotHash,
  });

  // DB 저장
  await prisma.registrySnapshot.create({
    data: {
      monitoredPropertyId: snapshot.monitoredPropertyId,
      sequenceNo: snapshot.sequenceNo,
      merkleRoot: snapshot.merkleRoot,
      snapshotHash: snapshot.snapshotHash,
      previousSnapshotHash: snapshot.previousSnapshotHash,
      signature: snapshot.signature,
      encryptedData: snapshot.encryptedData,
      sectionHashes: snapshot.sectionHashes as unknown as Record<string, unknown>[],
      timestamp: snapshot.timestamp,
    },
  });

  // 섹션 변동 비교
  const isFirstSnapshot = !latest;
  let changedSections: string[] = [];

  if (!isFirstSnapshot && latest?.sectionHashes) {
    const oldHashes = latest.sectionHashes as unknown as SectionHashes[];
    changedSections = getChangedSectionNames(oldHashes, snapshot.sectionHashes);
  }

  return {
    snapshotHash: snapshot.snapshotHash,
    sequenceNo,
    changedSections,
    isFirstSnapshot,
  };
}

// ── 체인 검증 ──

/**
 * 특정 물건의 스냅샷 체인 전체 무결성 검증
 */
export async function verifyPropertyChain(propertyId: string) {
  const snapshots = await prisma.registrySnapshot.findMany({
    where: { monitoredPropertyId: propertyId },
    orderBy: { sequenceNo: "asc" },
    select: {
      sequenceNo: true,
      merkleRoot: true,
      snapshotHash: true,
      previousSnapshotHash: true,
      signature: true,
      sectionHashes: true,
      monitoredPropertyId: true,
      timestamp: true,
    },
  });

  return verifySnapshotChain(
    snapshots.map((s) => ({
      ...s,
      sectionHashes: s.sectionHashes as unknown as SectionHashes[],
    }))
  );
}
