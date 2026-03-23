import { NextRequest, NextResponse } from "next/server";
import { collectNews } from "@/lib/news-collector";
import { withAdminAuth } from "@/lib/with-admin-auth";

export const POST = withAdminAuth(async (_req: NextRequest) => {
  try {
    const result = await collectNews();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[NewsCollector] 수동 수집 실패:", error);
    return NextResponse.json(
      { error: "수집에 실패했습니다." },
      { status: 500 }
    );
  }
});
