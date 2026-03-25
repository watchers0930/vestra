/**
 * Vercel Cron: 부동산 뉴스·정책 수집
 * ────────────────────────────────────
 * 스케줄: 매일 06:00 (vercel.json)
 * 보안: CRON_SECRET 검증
 */

import { NextResponse } from "next/server";
import { collectNews } from "@/lib/news-collector";
import { verifyCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await collectNews();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[NewsCollector] 크론 실패:", error);
    return NextResponse.json(
      { error: "Collection failed" },
      { status: 500 }
    );
  }
}
