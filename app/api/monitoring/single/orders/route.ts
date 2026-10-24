import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";
import { createSingleOrder } from "@/lib/member-single-monitoring/order";
import { singleErrorResponse } from "@/lib/member-single-monitoring/http";

const schema = z.object({
  address: z.string().trim().min(2).max(200),
  idempotencyKey: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const csrf = validateOrigin(req);
  if (csrf) return csrf;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const rl = await rateLimit(`monitoring-single-order:${session.user.id}`, 10);
  if (!rl.success) return NextResponse.json({ error: "요청 한도 초과" }, { status: 429, headers: rateLimitHeaders(rl) });
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "입력 내용을 확인해주세요." }, { status: 400 }); }
  try {
    const result = await createSingleOrder(session.user.id, body);
    return NextResponse.json(result.data, { status: result.created ? 201 : 200 });
  } catch (e) { return singleErrorResponse(e); }
}
