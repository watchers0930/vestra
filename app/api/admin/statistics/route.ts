import { NextResponse, type NextRequest } from "next/server";
import { withAdminAuth } from "@/lib/with-admin-auth";
import { fetchGa4Dashboard, type Ga4Period } from "@/lib/ga4-reports";
import { isGa4Configured } from "@/lib/ga4-client";

// GA4 클라이언트가 node crypto를 사용 → Edge 불가
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAdminAuth(async (request: NextRequest) => {
  if (!isGa4Configured()) {
    return NextResponse.json(
      { error: "GA4 연동이 설정되지 않았습니다 (환경변수 누락)" },
      { status: 503 },
    );
  }

  const raw = Number(request.nextUrl.searchParams.get("days"));
  const period: Ga4Period = raw === 7 ? 7 : raw === 90 ? 90 : 28;

  try {
    const data = await fetchGa4Dashboard(period);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "GA4 데이터 조회 실패";
    return NextResponse.json({ error: message }, { status: 502 });
  }
});
