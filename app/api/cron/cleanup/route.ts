/**
 * 정기 정리 cron — 하루 1회.
 *  1) 폼 이탈로 버려진 temp 업로드(고아 Blob) 정리 (DB 참조 대조 후 미참조만)
 *  2) AuditLog(365일)·Notification(180일) retention 정리
 *
 * 각 단계는 독립 try/catch — 하나가 실패해도 다른 정리는 진행한다.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { cleanupOrphanTempBlobs, cleanupOldRecords } from "@/lib/cron/cleanup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const result: Record<string, unknown> = {};

  try {
    result.blobs = await cleanupOrphanTempBlobs(now);
  } catch (e) {
    result.blobsError = e instanceof Error ? e.message : String(e);
  }

  try {
    result.records = await cleanupOldRecords(now);
  } catch (e) {
    result.recordsError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({ ok: true, ...result });
}
