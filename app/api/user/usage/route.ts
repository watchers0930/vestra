import { NextResponse } from "next/server";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { getDailyUsageCount } from "@/lib/rate-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const used = await getDailyUsageCount(session.user.id);
  const limit = session.user.dailyLimit || ROLE_LIMITS[session.user.role] || 5;

  return NextResponse.json({ used, limit, remaining: Math.max(0, limit - used) });
}
