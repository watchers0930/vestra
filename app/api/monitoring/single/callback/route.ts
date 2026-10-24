import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";
import { singlePaymentCallback } from "@/lib/member-single-monitoring/payment-callback";
import { singleErrorResponse } from "@/lib/member-single-monitoring/http";

export async function POST(req: NextRequest) {
  const csrf = validateOrigin(req);
  if (csrf) return csrf;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const rl = await rateLimit(`monitoring-single-callback:${session.user.id}`, 20);
  if (!rl.success) return NextResponse.json({ error: "요청 한도 초과" }, { status: 429, headers: rateLimitHeaders(rl) });
  let input: unknown;
  try { input = await req.json(); }
  catch { return NextResponse.json({ error: "입력 내용을 확인해주세요." }, { status: 400 }); }
  try {
    const result = await singlePaymentCallback(session.user.id, input);
    return NextResponse.json(result);
  } catch (e) { return singleErrorResponse(e); }
}
