import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  entriesToMarkdown,
  generateResearchJournalEntries,
  listResearchJournalEntries,
  saveResearchJournalEntries,
  saveResearchJournalEntry,
  type ResearchJournalEntry,
} from "@/lib/research-journal";
import { validateOrigin } from "@/lib/csrf";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const entries = await listResearchJournalEntries();
  return NextResponse.json({
    entries,
    markdown: entriesToMarkdown(entries),
    count: entries.length,
  });
}

export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const body = await req.json();
  const mode = typeof body.mode === "string" ? body.mode : "upsert";

  if (mode === "sync-git") {
    const entries = await generateResearchJournalEntries(process.cwd());
    const count = await saveResearchJournalEntries(entries, session?.user?.id);
    return NextResponse.json({
      message: "Git 변경이력 기반 연구일지를 동기화했습니다.",
      count,
      entries,
      markdown: entriesToMarkdown(entries),
    });
  }

  const entry = body.entry as Partial<ResearchJournalEntry> | undefined;
  if (!entry?.date || !entry.title || !entry.content) {
    return NextResponse.json(
      { error: "date, title, content가 필요합니다." },
      { status: 400 }
    );
  }

  await saveResearchJournalEntry({
    date: entry.date,
    title: entry.title,
    content: entry.content,
    commits: Array.isArray(entry.commits) ? entry.commits : [],
  }, session?.user?.id);

  const entries = await listResearchJournalEntries();
  return NextResponse.json({
    message: "연구일지 항목을 저장했습니다.",
    entries,
    markdown: entriesToMarkdown(entries),
  });
}
