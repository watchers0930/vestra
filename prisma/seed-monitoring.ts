/**
 * 등기감시 데모 데이터 시드 스크립트
 * ──────────────────────────────────
 * MonitoredProperty + RegistrySnapshot + MonitoringAlert 데모 데이터 생성.
 * 로그인한 첫 번째 사용자 계정에 연결.
 *
 * 실행: npx tsx prisma/seed-monitoring.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function randomHex(len: number): string {
  return crypto.randomBytes(len).toString("hex");
}

function randomBase64(len: number): string {
  return crypto.randomBytes(len).toString("base64");
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ── 데모 물건 데이터 ──

const PROPERTIES = [
  {
    address: "서울특별시 강남구 역삼동 826-37 르네상스타워 1205호",
    status: "active",
    monitorMode: "contract_gap",
    deposit: 32000,
    contractDate: daysAgo(45),
    moveInDate: daysAgo(-15), // 15일 후
    createdAt: daysAgo(30),
  },
  {
    address: "서울특별시 서초구 서초동 1445-3 서초현대아파트 301동 1402호",
    status: "active",
    monitorMode: "standard",
    deposit: 58000,
    contractDate: daysAgo(90),
    moveInDate: daysAgo(60),
    createdAt: daysAgo(85),
  },
  {
    address: "경기도 성남시 분당구 정자동 200 파크뷰 1208호",
    status: "paused",
    monitorMode: "standard",
    deposit: 24000,
    contractDate: daysAgo(120),
    moveInDate: daysAgo(90),
    createdAt: daysAgo(110),
  },
];

// ── 데모 알림 데이터 ──

interface AlertSeed {
  propertyIdx: number;
  changeType: string;
  summary: string;
  detail: string;
  riskLevel: string;
  isRead: boolean;
  daysAgo: number;
}

const ALERTS: AlertSeed[] = [
  {
    propertyIdx: 0,
    changeType: "mortgage_added",
    summary: "근저당권 설정 — 채권최고액 4억 8,000만원 (국민은행)",
    detail: "을구 제2호: 근저당권 설정. 채권최고액 금480,000,000원. 근저당권자 국민은행",
    riskLevel: "critical",
    isRead: false,
    daysAgo: 2,
  },
  {
    propertyIdx: 0,
    changeType: "right_change",
    summary: "전세권 설정 — 보증금 3억 2,000만원",
    detail: "을구 제1호: 전세권 설정. 전세금 금320,000,000원. 전세권자 김○○",
    riskLevel: "low",
    isRead: true,
    daysAgo: 25,
  },
  {
    propertyIdx: 1,
    changeType: "seizure_added",
    summary: "가압류 등기 — 서울중앙지방법원 2026카합12345",
    detail: "갑구 제5호: 가압류. 청구금액 금200,000,000원. 채권자 ○○캐피탈",
    riskLevel: "critical",
    isRead: false,
    daysAgo: 5,
  },
  {
    propertyIdx: 1,
    changeType: "mortgage_added",
    summary: "근저당권 추가 설정 — 채권최고액 6억원 (신한은행)",
    detail: "을구 제3호: 근저당권 설정. 채권최고액 금600,000,000원. 근저당권자 신한은행",
    riskLevel: "high",
    isRead: false,
    daysAgo: 15,
  },
  {
    propertyIdx: 1,
    changeType: "ownership_changed",
    summary: "소유권 일부이전 — 지분 1/2 매매",
    detail: "갑구 제4호: 소유권 일부이전. 원인: 2026년 3월 15일 매매. 지분 1/2",
    riskLevel: "high",
    isRead: true,
    daysAgo: 40,
  },
  {
    propertyIdx: 1,
    changeType: "lien_removed",
    summary: "가압류 해제 — 서울중앙지방법원 2025카합98765 말소",
    detail: "갑구 제3호: 가압류 말소",
    riskLevel: "low",
    isRead: true,
    daysAgo: 60,
  },
  {
    propertyIdx: 2,
    changeType: "provisional_registration",
    summary: "소유권이전 가등기 설정",
    detail: "갑구 제3호: 소유권이전청구권 가등기. 원인: 2026년 2월 1일 매매예약",
    riskLevel: "high",
    isRead: true,
    daysAgo: 80,
  },
];

// ── 스냅샷 생성 (해시 체인 구조) ──

interface SnapshotSeed {
  sequenceNo: number;
  merkleRoot: string;
  snapshotHash: string;
  previousSnapshotHash: string | null;
  signature: string;
  encryptedData: string;
  sectionHashes: { section: string; hash: string }[];
  timestamp: Date;
}

function generateSnapshotChain(
  propertyId: string,
  count: number,
  startDaysAgo: number
): SnapshotSeed[] {
  const chain: SnapshotSeed[] = [];
  let prevHash: string | null = null;

  for (let i = 1; i <= count; i++) {
    const timestamp = daysAgo(startDaysAgo - (i - 1) * 7);
    const sectionHashes = [
      { section: "title", hash: sha256(`title-${propertyId}-${i}`) },
      { section: "exclusive", hash: sha256(`exclusive-${propertyId}-${i}`) },
      { section: "gapgu", hash: sha256(`gapgu-${propertyId}-${i}-${i > 2 ? "changed" : "base"}`) },
      { section: "eulgu", hash: sha256(`eulgu-${propertyId}-${i}-${i > 1 ? "changed" : "base"}`) },
    ];

    const merkleRoot = sha256(sectionHashes.map((s) => s.hash).join("|"));
    const snapshotHash = sha256(
      `${merkleRoot}|${prevHash ?? "genesis"}|${timestamp.toISOString()}|${propertyId}`
    );
    const signature = randomBase64(64);
    const encryptedData = randomBase64(256);

    chain.push({
      sequenceNo: i,
      merkleRoot,
      snapshotHash,
      previousSnapshotHash: prevHash,
      signature,
      encryptedData,
      sectionHashes,
      timestamp,
    });

    prevHash = snapshotHash;
  }

  return chain;
}

// ── 메인 ──

async function main() {
  // 첫 번째 사용자 찾기
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    console.error("ERROR: 사용자가 없습니다. 먼저 회원가입 또는 seed-admin.ts를 실행하세요.");
    process.exit(1);
  }

  console.log(`사용자: ${user.email} (${user.id})`);

  // 기존 데모 데이터 정리
  const existing = await prisma.monitoredProperty.findMany({
    where: { userId: user.id },
    select: { id: true },
  });

  if (existing.length > 0) {
    console.log(`기존 감시 물건 ${existing.length}건 삭제 중...`);
    await prisma.monitoredProperty.deleteMany({
      where: { userId: user.id },
    });
  }

  // 물건 생성
  const propertyIds: string[] = [];

  for (const prop of PROPERTIES) {
    const created = await prisma.monitoredProperty.create({
      data: {
        userId: user.id,
        address: prop.address,
        status: prop.status,
        monitorMode: prop.monitorMode,
        deposit: prop.deposit,
        contractDate: prop.contractDate,
        moveInDate: prop.moveInDate,
        lastCheckedAt: daysAgo(1),
        createdAt: prop.createdAt,
      },
    });
    propertyIds.push(created.id);
    console.log(`  ✓ 물건 생성: ${prop.address.slice(0, 30)}...`);
  }

  // 스냅샷 생성
  const snapshotCounts = [4, 5, 3];
  for (let i = 0; i < propertyIds.length; i++) {
    const chain = generateSnapshotChain(
      propertyIds[i],
      snapshotCounts[i],
      PROPERTIES[i].createdAt.getTime() < Date.now()
        ? Math.floor((Date.now() - PROPERTIES[i].createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 30
    );

    for (const snap of chain) {
      await prisma.registrySnapshot.create({
        data: {
          monitoredPropertyId: propertyIds[i],
          ...snap,
          sectionHashes: snap.sectionHashes as never,
        },
      });
    }
    console.log(`  ✓ 스냅샷 ${chain.length}건 생성 (물건 ${i + 1})`);
  }

  // 알림 생성
  for (const alert of ALERTS) {
    await prisma.monitoringAlert.create({
      data: {
        monitoredPropertyId: propertyIds[alert.propertyIdx],
        changeType: alert.changeType,
        summary: alert.summary,
        detail: alert.detail,
        riskLevel: alert.riskLevel,
        isRead: alert.isRead,
        createdAt: daysAgo(alert.daysAgo),
      },
    });
  }
  console.log(`  ✓ 알림 ${ALERTS.length}건 생성`);

  console.log("\n✅ 등기감시 데모 데이터 초기화 완료!");
  console.log(`   물건: ${PROPERTIES.length}건`);
  console.log(`   스냅샷: ${snapshotCounts.reduce((a, b) => a + b, 0)}건`);
  console.log(`   알림: ${ALERTS.length}건`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
