import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  entriesToMarkdown,
  generateResearchJournalEntries,
  saveResearchJournalEntries,
} from "@/lib/research-journal";

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await generateResearchJournalEntries(process.cwd());
  const count = await saveResearchJournalEntries(entries, null);

  return NextResponse.json({
    message: "연구일지 자동 동기화 완료",
    count,
    markdownLength: entriesToMarkdown(entries).length,
    timestamp: new Date().toISOString(),
  });
}
