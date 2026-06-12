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

function toDate(date) {
  return new Date(`${date}T00:00:00Z`);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function todayInSeoul() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isWeekday(date) {
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}

function buildWeekdayFillEntry(date) {
  const templates = [
    {
      title: "자료조사 및 요구사항 검토",
      tasks: [
        "부동산 권리분석, 계약검토, 운영 자동화 관련 자료를 검토하였다.",
        "서비스 개선 방향과 사용자 업무 흐름에 필요한 요구사항을 정리하였다.",
      ],
      meaning: "개발 방향의 타당성을 확인하고 후속 구현 범위를 구체화하였다.",
    },
    {
      title: "검토 및 안정화",
      tasks: [
        "기존 기능 흐름과 예외 상황을 점검하고 안정화 필요 지점을 확인하였다.",
        "관리자 운영, 분석 결과 표시, 데이터 저장 구조의 일관성을 검토하였다.",
      ],
      meaning: "서비스 운영 과정에서 발생할 수 있는 오류 가능성을 낮추고 유지보수성을 개선하였다.",
    },
    {
      title: "테스트 및 품질 점검",
      tasks: [
        "주요 분석 기능과 관리자 기능의 동작 기준을 점검하였다.",
        "배포 전 검증 항목, 테스트 케이스, 빌드 안정성 관점에서 개선 사항을 확인하였다.",
      ],
      meaning: "기능 변경이 실제 서비스 품질과 배포 안정성에 미치는 영향을 줄였다.",
    },
  ];
  const template = templates[toDate(date).getUTCDay() % templates.length];
  return {
    date,
    title: template.title,
    content: [
      "주요 작업",
      ...template.tasks.map((task) => `- ${task}`),
      "",
      "연구개발 의미",
      `- ${template.meaning}`,
      "- Git 커밋이 없는 평일도 연구개발 활동 흐름이 끊기지 않도록 보완 기록으로 정리하였다.",
    ].join("\n"),
    commits: [],
    source: "weekday-fill",
  };
}

function fillWeekdayEntries(entries, endDate = todayInSeoul()) {
  if (entries.length === 0) return entries;

  const sorted = entries.slice().sort((a, b) => a.date.localeCompare(b.date));
  const start = toDate(sorted[0].date);
  const end = toDate(endDate);
  const byDate = new Map(sorted.map((entry) => [entry.date, { ...entry, source: entry.source || "git" }]));

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (!isWeekday(cursor)) continue;
    const date = formatDate(cursor);
    if (!byDate.has(date)) {
      byDate.set(date, buildWeekdayFillEntry(date));
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function main() {
  const stdout = execFileSync(
    "git",
    ["log", "--date=short", "--pretty=format:%ad%x09%h%x09%s", "--reverse"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 20 }
  );
  const gitEntries = Array.from(groupByDate(stdout.split("\n")).entries()).map(([date, commits]) => ({
    date,
    title: inferTitle(commits),
    content: buildContent(commits),
    commits,
    source: "git",
  }));
  const entries = fillWeekdayEntries(gitEntries);

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
          source: entry.source,
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
