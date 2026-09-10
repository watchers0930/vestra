/**
 * P0-3 SEARCH_INDEX_KEY 전환 rekey 백필 (멱등)
 * ───────────────────────────────────────────────────────────────────
 * blind index 해시를 **신규 SEARCH_INDEX_KEY 기준으로 재계산**해 갱신한다.
 * 대상:
 *   - AgentClient.clientEmailHash  ← decryptPII(clientEmail)에서 재해시 (기본)
 *   - TrainingData.rawTextHash     ← `--include-training` 플래그 시에만 (아래 ⚠️ 참고)
 *
 * ⚠️ TrainingData 제외 이유(2026-09-10 실측): 운영 102건의 rawTextHash가 현재
 *    hashForSearch(decryptPII(rawTextEncrypted))와 **같은 키에서도 불일치** — 현재 해싱
 *    파이프라인 이전에 생성된 과거 데이터라 원본 해시를 재현할 수 없다. 키만 바꾸는 rekey가
 *    성립하지 않으므로 기본 제외한다(관리자 전용·저위험 dedup). 현재 해싱으로 정렬하려면
 *    이는 "키 전환"이 아니라 "재정규화"라는 별도 결정 → `--include-training`으로 명시 옵트인.
 *
 * 기존 backfill-agentclient-emailhash.ts는 "빈 해시 채우기"만 하지만,
 * 이 스크립트는 키 전환을 위해 **값이 달라졌을 때 갱신(rekey)** 한다.
 *
 * 안전장치:
 *   - 비확장 base PrismaClient (해시 컬럼은 PII 필드 아님 → 이중처리 없음)
 *   - 기본 dry-run. 실제 쓰기는 `--commit`.
 *   - 값(이메일·원문)은 로그에 남기지 않는다.
 *   - 멱등: 이미 신규키 해시면 skip.
 *
 * 실행 순서(중요):
 *   1) 전 환경(로컬·Vercel)에 SEARCH_INDEX_KEY 동일 설정
 *   2) 듀얼리드 코드 운영 배포 (조회가 신·구키 후보를 모두 매칭)
 *   3) 이 스크립트로 rekey 백필 → 4) 검증 → 5) 다음 배포에서 구키 폴백 제거
 *
 *   npx tsx scripts/backfill-search-index-rekey.ts           # dry-run
 *   npx tsx scripts/backfill-search-index-rekey.ts --commit  # 실제 백필
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";
import { decryptPII, hashForSearch } from "@/lib/crypto";

const COMMIT = process.argv.includes("--commit");
const INCLUDE_TRAINING = process.argv.includes("--include-training");
const BATCH = 200;
const db = new PrismaClient();

async function rekeyAgentClient() {
  let cursorId: string | null = null;
  let scanned = 0, rekeyed = 0, same = 0, noEmail = 0;

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
      if (!row.clientEmail) { noEmail++; continue; }
      const plain = decryptPII(row.clientEmail);
      const next = hashForSearch(plain);
      if (row.clientEmailHash === next) { same++; continue; }
      if (COMMIT) {
        await db.agentClient.update({ where: { id: row.id }, data: { clientEmailHash: next } });
      }
      rekeyed++;
    }
    cursorId = rows[rows.length - 1].id;
    if (rows.length < BATCH) break;
  }
  console.log(`[AgentClient.clientEmailHash] 스캔 ${scanned} | rekey ${rekeyed} | 동일 ${same} | 이메일없음 ${noEmail}${COMMIT ? "" : " | (dry-run)"}`);
}

async function rekeyTrainingData() {
  let cursorId: string | null = null;
  let scanned = 0, rekeyed = 0, same = 0, fail = 0;

  for (;;) {
    const rows: { id: string; rawTextEncrypted: string; rawTextHash: string }[] =
      await db.trainingData.findMany({
        select: { id: true, rawTextEncrypted: true, rawTextHash: true },
        orderBy: { id: "asc" },
        take: BATCH,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      });
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned++;
      const plain = decryptPII(row.rawTextEncrypted);
      if (!plain) { fail++; continue; }
      const next = hashForSearch(plain);
      if (row.rawTextHash === next) { same++; continue; }
      if (COMMIT) {
        await db.trainingData.update({ where: { id: row.id }, data: { rawTextHash: next } });
      }
      rekeyed++;
    }
    cursorId = rows[rows.length - 1].id;
    if (rows.length < BATCH) break;
  }
  console.log(`[TrainingData.rawTextHash] 스캔 ${scanned} | rekey ${rekeyed} | 동일 ${same} | 복호화실패 ${fail}${COMMIT ? "" : " | (dry-run)"}`);
}

async function main() {
  console.log(`P0-3 blind index rekey — 모드: ${COMMIT ? "COMMIT(실제 쓰기)" : "DRY-RUN(조회만)"}`);
  if (!process.env.SEARCH_INDEX_KEY) {
    console.warn("⚠️ SEARCH_INDEX_KEY 미설정 — 신규키==AUTH_SECRET이라 rekey는 무동작(no-op)입니다. 전환 시 env 설정 후 실행하세요.");
  }
  await rekeyAgentClient();
  if (INCLUDE_TRAINING) {
    console.warn("⚠️ --include-training: TrainingData.rawTextHash 재계산은 '키 전환'이 아닌 '재정규화'입니다. 과거 해시와 무관하게 현재 해싱으로 덮어씁니다.");
    await rekeyTrainingData();
  } else {
    console.log("[TrainingData.rawTextHash] 기본 제외(과거 해시 재현 불가). 필요 시 --include-training.");
  }
  console.log(COMMIT ? "rekey 백필 완료." : "dry-run 완료. 실제 적용은 --commit 으로 재실행.");
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("rekey 백필 실패:", e instanceof Error ? e.message : e);
  await db.$disconnect();
  process.exit(1);
});
