/**
 * 등기 원문 평문 → 암호화 백필 (1회성)
 * ───────────────────────────────────────────────
 * 대상: MonitoredProperty.baselineData, RegistryIssueOrder.documentText
 *
 * 안전장치:
 * - 비확장 base PrismaClient 사용 (@/lib/prisma 확장본은 자동 암/복호화 → 이중 암호화 위험)
 * - 멱등 판정: decryptPII(v) === v 이면 "평문(미암호화)"으로 보고 encryptPII 적용.
 *   이미 암호화된 값은 복호화되어 원문으로 바뀌므로(!==) 건너뜀.
 * - 기본 dry-run. 실제 쓰기는 `--commit` 플래그가 있을 때만.
 * - 원문 내용은 로그에 남기지 않는다 (개인정보 노출 금지).
 *
 * 실행:
 *   npx tsx scripts/backfill-registry-encryption.ts          # dry-run (건수만)
 *   npx tsx scripts/backfill-registry-encryption.ts --commit # 실제 백필
 *
 * ⚠️ 운영 DB 쓰기다. 반드시 DB 백업/스냅샷 후, 대장 승인 하에 --commit 으로 실행할 것.
 * ⚠️ 실행 전에 PII_FIELDS 암호화 코드가 먼저 배포돼 있어야 한다(신규 write는 이미 암호문 → 멱등 정확).
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";
import { encryptPII, decryptPII } from "@/lib/crypto";

const COMMIT = process.argv.includes("--commit");
const BATCH = 200;

// 비확장 base 클라이언트 (자동 암/복호화 없음)
const db = new PrismaClient();

/** 값이 평문(미암호화)인지 판정 — decryptPII가 원본을 그대로 반환하면 평문 */
function isPlaintext(value: string): boolean {
  return decryptPII(value) === value;
}

interface Target {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findChunk: (cursorId: string | null) => Promise<{ id: string; value: string | null }[]>;
  update: (id: string, encrypted: string) => Promise<void>;
}

async function processTarget(t: Target) {
  let cursorId: string | null = null;
  let scanned = 0;
  let plaintext = 0;
  let encrypted = 0;
  let alreadyEnc = 0;

  for (;;) {
    const rows = await t.findChunk(cursorId);
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned++;
      const v = row.value;
      if (!v) continue;
      if (isPlaintext(v)) {
        plaintext++;
        if (COMMIT) {
          await t.update(row.id, encryptPII(v));
          encrypted++;
        }
      } else {
        alreadyEnc++;
      }
    }

    cursorId = rows[rows.length - 1].id;
    if (rows.length < BATCH) break;
  }

  console.log(
    `[${t.label}] 스캔 ${scanned} | 평문 ${plaintext} | 이미암호화 ${alreadyEnc}` +
      (COMMIT ? ` | 암호화적용 ${encrypted}` : " | (dry-run: 미적용)")
  );
}

async function main() {
  console.log(`등기 원문 암호화 백필 시작 — 모드: ${COMMIT ? "COMMIT(실제 쓰기)" : "DRY-RUN(조회만)"}`);

  await processTarget({
    label: "MonitoredProperty.baselineData",
    findChunk: (cursorId) =>
      db.monitoredProperty.findMany({
        where: { baselineData: { not: null } },
        select: { id: true, baselineData: true },
        orderBy: { id: "asc" },
        take: BATCH,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      }).then((rows) => rows.map((r) => ({ id: r.id, value: r.baselineData }))),
    update: (id, encrypted) =>
      db.monitoredProperty.update({ where: { id }, data: { baselineData: encrypted } }).then(() => undefined),
  });

  await processTarget({
    label: "RegistryIssueOrder.documentText",
    findChunk: (cursorId) =>
      db.registryIssueOrder.findMany({
        where: { documentText: { not: null } },
        select: { id: true, documentText: true },
        orderBy: { id: "asc" },
        take: BATCH,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      }).then((rows) => rows.map((r) => ({ id: r.id, value: r.documentText }))),
    update: (id, encrypted) =>
      db.registryIssueOrder.update({ where: { id }, data: { documentText: encrypted } }).then(() => undefined),
  });

  console.log(COMMIT ? "백필 완료." : "dry-run 완료. 실제 적용은 --commit 으로 재실행.");
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("백필 실패:", e instanceof Error ? e.message : e);
  await db.$disconnect();
  process.exit(1);
});
