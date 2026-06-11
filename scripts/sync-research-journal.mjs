import { execFileSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ACTION = "RESEARCH_JOURNAL_ENTRY";

const KEYWORDS = [
  [/등기|권리|registry|codef|tilko|말소|근저당/i, "등기/권리분석"],
  [/감시|monitor|알림|notification|toast|증명서/i, "등기감시/알림"],
  [/사업성|feasibility|SCR|MOLIT|실거래/i, "사업성분석"],
  [/회원|가입|auth|login|sidebar|대시보드|UI|UX/i, "서비스 UI/회원"],
  [/관리자|admin|API KEY|설정|audit/i, "관리자/운영"],
  [/테스트|lint|build|refactor|리팩터링/i, "품질개선"],
];

function groupByDate(lines) {
  const grouped = new Map();
  for (const line of lines) {
    const [date, hash, ...subjectParts] = line.split("\t");
    const subject = subjectParts.join("\t").trim();
    if (!date || !hash || !subject) continue;
    const items = grouped.get(date) ?? [];
    items.push(`${hash} ${subject}`);
    grouped.set(date, items);
  }
  return grouped;
}

function inferTitle(commits) {
  const joined = commits.join(" ");
  const matched = KEYWORDS.filter(([pattern]) => pattern.test(joined)).map(([, label]) => label);
  if (matched.length === 0) return "VESTRA 기능 개발 및 안정화";
  return `${Array.from(new Set(matched)).slice(0, 3).join(", ")} 고도화`;
}

function buildContent(commits) {
  const normalized = commits.map((item) => item.replace(/^[a-f0-9]{7,}\s+/, ""));
  return [
    "주요 작업",
    ...normalized.map((subject) => `- ${subject}`),
    "",
    "연구개발 의미",
    "- 서비스 기능, 데이터 처리 로직, 사용자 흐름 또는 운영 안정성을 개선하였다.",
    "- 변경 사항은 Git 커밋 이력을 기준으로 추적 가능하도록 정리하였다.",
  ].join("\n");
}

async function main() {
  const stdout = execFileSync(
    "git",
    ["log", "--date=short", "--pretty=format:%ad%x09%h%x09%s", "--reverse"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 20 }
  );
  const entries = Array.from(groupByDate(stdout.split("\n")).entries()).map(([date, commits]) => ({
    date,
    title: inferTitle(commits),
    content: buildContent(commits),
    commits,
  }));

  for (const entry of entries) {
    await prisma.auditLog.deleteMany({ where: { action: ACTION, target: entry.date } });
    await prisma.auditLog.create({
      data: {
        action: ACTION,
        target: entry.date,
        detail: JSON.stringify({
          title: entry.title,
          content: entry.content,
          commits: entry.commits,
        }),
        ipAddress: "script",
        userAgent: "scripts/sync-research-journal.mjs",
      },
    });
  }

  console.log(`Synced ${entries.length} research journal entries.`);
  console.log(`First: ${entries[0]?.date || "n/a"}, Last: ${entries.at(-1)?.date || "n/a"}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
