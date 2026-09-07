import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  entriesToMarkdown,
  generateResearchJournalEntries,
  saveResearchJournalEntries,
} from "@/lib/research-journal";

// git log / GitHub API 폴백 + 전체 이력 저장까지 여유를 두어 타임아웃을 방지한다.
export const maxDuration = 60;

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
