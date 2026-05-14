import { NextResponse } from "next/server";

import { fetchPublicAnalyticsOverview } from "@/lib/public-analytics";

function clampRangeDays(value: number) {
  if (!Number.isFinite(value)) return 30;
  return Math.min(365, Math.max(7, Math.round(value)));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rangeDays = clampRangeDays(Number(url.searchParams.get("days") || 30));
    const overview = await fetchPublicAnalyticsOverview(rangeDays);

    return NextResponse.json(overview, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "공개 방문 통계 조회에 실패했습니다.",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 502 },
    );
  }
}
