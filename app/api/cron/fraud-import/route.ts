/**
 * Vercel Cron: 전세사기 피해사례 데이터 주기적 갱신
 * ──────────────────────────────────────────────
 * 스케줄: 매주 월요일 03:00 (vercel.json)
 * 보안: CRON_SECRET 검증
 */

import { NextResponse } from "next/server";
import { importFromExternalSource } from "@/lib/fraud-data-importer";
import { verifyCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await importFromExternalSource();

    console.info(
      `[FraudImport] 완료: ${result.imported}건 임포트, ${result.errors.length}건 오류`
    );

    return NextResponse.json({
      success: true,
      imported: result.imported,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[FraudImport] 크론 실패:", error);
    return NextResponse.json(
      { error: "Import failed", detail: String(error) },
      { status: 500 }
    );
  }
}
