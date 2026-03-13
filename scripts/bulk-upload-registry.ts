/**
 * 등기부등본 50개 일괄 업로드 스크립트
 * Prisma로 직접 DB에 삽입 (API 인증 우회)
 *
 * 실행: npx tsx scripts/bulk-upload-registry.ts
 */

import { readdirSync, readFileSync } from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { parseRegistry } from "../lib/registry-parser";
import { normalizeRegistryText, detectRegistryConfidence } from "../lib/pdf-parser";
import { extractVocabularyFromParsed } from "../lib/domain-vocabulary";

// ─── Prisma + 암호화 초기화 ───

const prisma = new PrismaClient();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const PII_SALT = "vestra-pii-salt";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET 환경변수가 필요합니다.");
  return secret;
}

function derivePIIKey(): Buffer {
  return crypto.scryptSync(getSecret(), PII_SALT, 32);
}

function encryptPII(plaintext: string): string {
  if (!plaintext) return "";
  const key = derivePIIKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function hashForSearch(value: string): string {
  if (!value) return "";
  return crypto.createHmac("sha256", getSecret()).update(value.trim().toLowerCase()).digest("hex");
}

// ─── 메인 ───

async function main() {
  const dir = path.join(__dirname, "output", "registry-samples");
  const files = readdirSync(dir).filter((f) => f.endsWith(".txt")).sort();

  console.log(`\n📁 ${files.length}개 파일 발견: ${dir}\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const filepath = path.join(dir, file);
    const rawText = readFileSync(filepath, "utf-8");

    // 정규화 + 신뢰도
    const normalized = normalizeRegistryText(rawText);
    const { confidence } = detectRegistryConfidence(normalized);

    // 중복 검사
    const textHash = hashForSearch(normalized);
    const existing = await prisma.trainingData.findUnique({
      where: { rawTextHash: textHash },
    });

    if (existing) {
      console.log(`⏭️  ${file} — 이미 등록됨 (${existing.id})`);
      skipped++;
      continue;
    }

    try {
      // 파싱
      const parsed = parseRegistry(normalized);

      // 암호화
      const encrypted = encryptPII(normalized);

      // DB 저장
      const record = await prisma.trainingData.create({
        data: {
          rawTextEncrypted: encrypted,
          rawTextHash: textHash,
          parsedData: JSON.parse(JSON.stringify(parsed)),
          sourceFileName: file,
          sourceType: "text",
          confidence,
          charCount: normalized.length,
          gapguCount: parsed.gapgu.length,
          eulguCount: parsed.eulgu.length,
        },
      });

      // 도메인 용어 자동 추출
      const terms = extractVocabularyFromParsed(parsed, normalized);
      for (const t of terms) {
        await prisma.domainVocabulary
          .upsert({
            where: { term: t.term },
            update: { frequency: { increment: 1 } },
            create: { term: t.term, category: t.category, source: "auto_extracted" },
          })
          .catch(() => {});
      }

      console.log(
        `✅ ${file} — id: ${record.id}, 신뢰도: ${confidence}%, 갑구: ${parsed.gapgu.length}, 을구: ${parsed.eulgu.length}`
      );
      success++;
    } catch (err: any) {
      console.error(`❌ ${file} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`📊 결과: 성공 ${success} | 중복 ${skipped} | 실패 ${failed} / 총 ${files.length}`);
  console.log(`${"─".repeat(50)}\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
