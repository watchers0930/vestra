/**
 * PII 암호화 백필 (범용, 1회성·멱등)
 * ───────────────────────────────────────────────
 * lib/prisma.ts의 PII_FIELDS를 단일 소스로 순회하며 각 필드를 최신 키(v2)로 정규화한다.
 *  - 평문(미암호화)      → encryptPII (v2)
 *  - v2 암호문("v2:" prefix) → skip (멱등)
 *
 * ⚠️ S8(v1 폐기) 이후 주의: crypto.decryptPII는 이제 v2 prefix 없는 값을 무조건 원본 반환한다.
 *    따라서 잔존 v1 암호문이 있으면 이 스크립트가 "평문"으로 오분류해 이중 암호화(v2로 감쌈)한다.
 *    운영 전 필드 v1 0건 확인 완료(S8a) → 현재 안전하나, v1 잔존 상태에서는 절대 실행 금지.
 *    (v1→v2 재암호화가 필요하면 S8 이전 crypto 또는 전용 이관 스크립트로 별도 처리)
 *
 * 안전장치:
 *  - 비확장 base PrismaClient (자동 암/복호화 없음 → 이중 암호화 방지)
 *  - 기본 dry-run. 실제 쓰기는 `--commit` 플래그.
 *  - 원문 내용은 로그에 남기지 않는다 (개인정보 노출 금지).
 *
 * 실행:
 *   npx tsx scripts/backfill-pii-encryption.ts           # dry-run (건수만)
 *   npx tsx scripts/backfill-pii-encryption.ts --commit  # 실제 백필
 *
 * ⚠️ 운영 DB 쓰기. DB 백업/스냅샷 후, 대장 승인 하에 --commit 으로 실행할 것.
 * ⚠️ 반드시 PII_ENCRYPTION_KEY(v2) + 암호화 코드가 운영 배포된 후 실행.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";
import { encryptPII, decryptPII } from "@/lib/crypto";
import { PII_FIELDS } from "@/lib/prisma";

const COMMIT = process.argv.includes("--commit");
const BATCH = 200;
const V2_PREFIX = "v2:";

// 비확장 base 클라이언트 (자동 암/복호화 없음)
const db = new PrismaClient();

async function processField(model: string, field: string) {
  const accessor = model[0].toLowerCase() + model.slice(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (db as any)[accessor];
  if (!client?.findMany) {
    console.log(`[${model}.${field}] 스킵 — 모델 접근 불가(${accessor})`);
    return;
  }

  let cursorId: string | null = null;
  let scanned = 0, plaintext = 0, v1 = 0, v2skip = 0, upgraded = 0;

  for (;;) {
    // where 없이 전체 스캔 후 코드에서 null/빈값 스킵 (필드 nullable 여부와 무관하게 안전)
    const rows: { id: string; [k: string]: unknown }[] = await client.findMany({
      select: { id: true, [field]: true },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      const v = row[field];
      if (typeof v !== "string" || !v) continue;
      scanned++;

      if (v.startsWith(V2_PREFIX)) { v2skip++; continue; }

      const dec = decryptPII(v);
      if (dec === v) plaintext++; else v1++;

      if (COMMIT) {
        await client.update({ where: { id: row.id }, data: { [field]: encryptPII(dec) } });
        upgraded++;
      }
    }

    cursorId = rows[rows.length - 1].id;
    if (rows.length < BATCH) break;
  }

  console.log(
    `[${model}.${field}] 스캔 ${scanned} | 평문 ${plaintext} | v1 ${v1} | v2(skip) ${v2skip}` +
      (COMMIT ? ` | v2로 업그레이드 ${upgraded}` : " | (dry-run)")
  );
}

async function main() {
  console.log(`PII 암호화 백필 — 모드: ${COMMIT ? "COMMIT(실제 쓰기)" : "DRY-RUN(조회만)"}`);
  for (const [model, fields] of Object.entries(PII_FIELDS)) {
    for (const field of fields) {
      await processField(model, field);
    }
  }
  console.log(COMMIT ? "백필 완료." : "dry-run 완료. 실제 적용은 --commit 으로 재실행.");
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("백필 실패:", e instanceof Error ? e.message : e);
  await db.$disconnect();
  process.exit(1);
});
