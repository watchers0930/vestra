import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { generateResearchJournalFromGit, saveResearchJournalEntries } from "@/lib/research-journal";
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("로컬 git 로그로 연구일지 전체 재생성 중...");
  const entries = await generateResearchJournalFromGit(process.cwd());
  console.log(`생성된 항목: ${entries.length}일치`);
  console.log(`  첫 날: ${entries[0]?.date}`);
  console.log(`  마지막 날: ${entries[entries.length - 1]?.date}`);

  const count = await saveResearchJournalEntries(entries, null);
  console.log(`DB 저장 완료: ${count}일치`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
