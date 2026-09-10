/**
 * S5 blind index 백필 — AgentClient.clientEmailHash 채우기 (1회성·멱등)
 * ───────────────────────────────────────────────────────────────────
 * clientEmail을 복호화한 평문에서 hashForSearch(HMAC)를 계산해 clientEmailHash에 채운다.
 *  - clientEmailHash가 이미 있으면 skip (멱등)
 *  - clientEmail이 null이면 skip
 *  - clientEmail이 평문이든 v2 암호문이든 decryptPII로 평문을 얻어 계산 → 실행 순서 무관
 *    (clientName·clientEmail 자체의 암호화는 범용 scripts/backfill-pii-encryption.ts가 담당)
 *
 * 안전장치:
 *  - 비확장 base PrismaClient (자동 암/복호화 없음)
 *  - 기본 dry-run. 실제 쓰기는 `--commit`.
 *  - 원문(이메일)은 로그에 남기지 않는다.
 *
 * 실행:
 *   npx tsx scripts/backfill-agentclient-emailhash.ts           # dry-run
 *   npx tsx scripts/backfill-agentclient-emailhash.ts --commit  # 실제 백필
 *
 * ⚠️ 운영 DB 쓰기. 코드(hashForSearch·스키마) 운영 배포 후, 대장 승인 하에 실행.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";
import { decryptPII, hashForSearch } from "@/lib/crypto";

const COMMIT = process.argv.includes("--commit");
const BATCH = 200;

// 비확장 base 클라이언트 (자동 암/복호화 없음)
const db = new PrismaClient();

async function main() {
  console.log(`S5 clientEmailHash 백필 — 모드: ${COMMIT ? "COMMIT(실제 쓰기)" : "DRY-RUN(조회만)"}`);

  let cursorId: string | null = null;
  let scanned = 0, filled = 0, skipHasHash = 0, skipNoEmail = 0;

  for (;;) {
    const rows: { id: string; clientEmail: string | null; clientEmailHash: string | null }[] =
      await db.agentClient.findMany({
        select: { id: true, clientEmail: true, clientEmailHash: true },
        orderBy: { id: "asc" },
        take: BATCH,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      });
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned++;
      if (!row.clientEmail) { skipNoEmail++; continue; }
      if (row.clientEmailHash) { skipHasHash++; continue; }

      const plain = decryptPII(row.clientEmail); // 평문/암호문 모두 평문으로
      const hash = hashForSearch(plain);

      if (COMMIT) {
        await db.agentClient.update({ where: { id: row.id }, data: { clientEmailHash: hash } });
      }
      filled++;
    }

    cursorId = rows[rows.length - 1].id;
    if (rows.length < BATCH) break;
  }

  console.log(
    `[AgentClient.clientEmailHash] 스캔 ${scanned} | 채움 ${filled} | ` +
      `이미있음(skip) ${skipHasHash} | 이메일없음(skip) ${skipNoEmail}` +
      (COMMIT ? "" : " | (dry-run)")
  );
  console.log(COMMIT ? "백필 완료." : "dry-run 완료. 실제 적용은 --commit 으로 재실행.");
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("백필 실패:", e instanceof Error ? e.message : e);
  await db.$disconnect();
  process.exit(1);
});
