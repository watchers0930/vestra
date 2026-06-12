import { execFile } from "child_process";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";

const execFileAsync = promisify(execFile);
export const RESEARCH_JOURNAL_ACTION = "RESEARCH_JOURNAL_ENTRY";

export interface ResearchJournalEntry {
  id?: string;
  date: string;
  title: string;
  content: string;
  commits: string[];
  source?: "git" | "weekday-fill" | "manual";
  createdAt?: string;
  updatedAt?: string;
}

interface GitHubCommit {
  sha: string;
  commit?: {
    message?: string;
    author?: {
      date?: string;
    };
  };
}

const KEYWORDS: Array<[RegExp, string]> = [
  [/등기|권리|registry|codef|tilko|말소|근저당/i, "등기/권리분석"],
  [/감시|monitor|알림|notification|toast|증명서/i, "등기감시/알림"],
  [/사업성|feasibility|SCR|MOLIT|실거래/i, "사업성분석"],
  [/회원|가입|auth|login|sidebar|대시보드|UI|UX/i, "서비스 UI/회원"],
  [/관리자|admin|API KEY|설정|audit/i, "관리자/운영"],
  [/테스트|lint|build|refactor|리팩터링/i, "품질개선"],
];

function groupByDate(lines: string[]) {
  const grouped = new Map<string, string[]>();
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

function inferTitle(commits: string[]) {
  const joined = commits.join(" ");
  const matched = KEYWORDS.filter(([pattern]) => pattern.test(joined)).map(([, label]) => label);
  if (matched.length === 0) return "VESTRA 기능 개발 및 안정화";
  return `${Array.from(new Set(matched)).slice(0, 3).join(", ")} 고도화`;
}

function buildContent(commits: string[]) {
  const normalized = commits.map((item) => item.replace(/^[a-f0-9]{7,}\s+/, ""));
  const lines = normalized.map((subject) => `- ${subject}`);
  return [
    "주요 작업",
    ...lines,
    "",
    "연구개발 의미",
    "- 서비스 기능, 데이터 처리 로직, 사용자 흐름 또는 운영 안정성을 개선하였다.",
    "- 변경 사항은 Git 커밋 이력을 기준으로 추적 가능하도록 정리하였다.",
  ].join("\n");
}

function toDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function formatDate(date: Date) {
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

function isWeekday(date: Date) {
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}

function buildWeekdayFillEntry(date: string): ResearchJournalEntry {
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
  const index = toDate(date).getUTCDay() % templates.length;
  const template = templates[index];

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

function fillWeekdayEntries(entries: ResearchJournalEntry[], endDate = todayInSeoul()) {
  if (entries.length === 0) return entries;

  const sorted = entries.slice().sort((a, b) => a.date.localeCompare(b.date));
  const start = toDate(sorted[0].date);
  const end = toDate(endDate);
  const byDate = new Map<string, ResearchJournalEntry>(
    sorted.map((entry) => [entry.date, { ...entry, source: entry.source || "git" }])
  );

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (!isWeekday(cursor)) continue;
    const date = formatDate(cursor);
    if (!byDate.has(date)) {
      byDate.set(date, buildWeekdayFillEntry(date));
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function generateResearchJournalFromGit(cwd: string): Promise<ResearchJournalEntry[]> {
  const { stdout } = await execFileAsync(
    "git",
    ["log", "--date=short", "--pretty=format:%ad%x09%h%x09%s", "--reverse"],
    { cwd, maxBuffer: 1024 * 1024 * 10 }
  );
  const grouped = groupByDate(stdout.split("\n"));
  const entries = Array.from(grouped.entries()).map(([date, commits]) => ({
    date,
    title: inferTitle(commits),
    content: buildContent(commits),
    commits,
    source: "git" as const,
  }));
  return fillWeekdayEntries(entries);
}

export async function generateResearchJournalFromGitHub(): Promise<ResearchJournalEntry[]> {
  const repo = process.env.RESEARCH_JOURNAL_GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || "watchers0930/vestra";
  const branch = process.env.RESEARCH_JOURNAL_GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "vestra-research-journal",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const rows: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = new URL(`https://api.github.com/repos/${repo}/commits`);
    url.searchParams.set("sha", branch);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      throw new Error(`GitHub 커밋 조회 실패 (${res.status})`);
    }
    const commits = await res.json() as GitHubCommit[];
    if (commits.length === 0) break;

    for (const item of commits) {
      const date = item.commit?.author?.date?.slice(0, 10);
      const subject = item.commit?.message?.split("\n")[0]?.trim();
      if (!date || !subject) continue;
      rows.push(`${date}\t${item.sha.slice(0, 7)}\t${subject}`);
    }
    if (commits.length < 100) break;
  }

  const grouped = groupByDate(rows.reverse());
  const entries = Array.from(grouped.entries()).map(([date, commits]) => ({
    date,
    title: inferTitle(commits),
    content: buildContent(commits),
    commits,
    source: "git" as const,
  }));
  return fillWeekdayEntries(entries);
}

export async function generateResearchJournalEntries(cwd: string): Promise<ResearchJournalEntry[]> {
  try {
    return await generateResearchJournalFromGit(cwd);
  } catch {
    return generateResearchJournalFromGitHub();
  }
}

function parseStoredEntry(row: {
  id: string;
  target: string | null;
  detail: string | null;
  createdAt: Date;
}): ResearchJournalEntry | null {
  if (!row.target || !row.detail) return null;
  try {
    const detail = JSON.parse(row.detail) as Partial<ResearchJournalEntry>;
    return {
      id: row.id,
      date: row.target,
      title: detail.title || "VESTRA 연구개발",
      content: detail.content || "",
      commits: Array.isArray(detail.commits) ? detail.commits : [],
      source: detail.source || (Array.isArray(detail.commits) && detail.commits.length > 0 ? "git" : "weekday-fill"),
      createdAt: row.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function listResearchJournalEntries(): Promise<ResearchJournalEntry[]> {
  const rows = await prisma.auditLog.findMany({
    where: { action: RESEARCH_JOURNAL_ACTION },
    orderBy: { target: "asc" },
    select: { id: true, target: true, detail: true, createdAt: true },
  });
  return rows.map(parseStoredEntry).filter((entry): entry is ResearchJournalEntry => !!entry);
}

export async function saveResearchJournalEntry(
  entry: ResearchJournalEntry,
  userId?: string | null
): Promise<void> {
  await prisma.auditLog.deleteMany({
    where: {
      action: RESEARCH_JOURNAL_ACTION,
      target: entry.date,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: userId || null,
      action: RESEARCH_JOURNAL_ACTION,
      target: entry.date,
      detail: JSON.stringify({
        title: entry.title,
        content: entry.content,
        commits: entry.commits,
        source: entry.source || "manual",
      }),
      ipAddress: "system",
      userAgent: "research-journal",
    },
  });
}

export async function saveResearchJournalEntries(
  entries: ResearchJournalEntry[],
  userId?: string | null
): Promise<number> {
  for (const entry of entries) {
    await saveResearchJournalEntry(entry, userId);
  }
  return entries.length;
}

export function entriesToMarkdown(entries: ResearchJournalEntry[]) {
  return entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => [
      `## ${entry.date} ${entry.title}`,
      "",
      entry.content,
      "",
      entry.commits.length > 0 ? "커밋 근거" : "",
      ...entry.commits.map((commit) => `- ${commit}`),
    ].filter(Boolean).join("\n"))
    .join("\n\n");
}
