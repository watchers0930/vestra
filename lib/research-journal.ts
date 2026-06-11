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

export async function generateResearchJournalFromGit(cwd: string): Promise<ResearchJournalEntry[]> {
  const { stdout } = await execFileAsync(
    "git",
    ["log", "--date=short", "--pretty=format:%ad%x09%h%x09%s", "--reverse"],
    { cwd, maxBuffer: 1024 * 1024 * 10 }
  );
  const grouped = groupByDate(stdout.split("\n"));
  return Array.from(grouped.entries()).map(([date, commits]) => ({
    date,
    title: inferTitle(commits),
    content: buildContent(commits),
    commits,
  }));
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
  return Array.from(grouped.entries()).map(([date, commits]) => ({
    date,
    title: inferTitle(commits),
    content: buildContent(commits),
    commits,
  }));
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
