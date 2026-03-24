import { NextRequest, NextResponse } from "next/server";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { generateDecisionReport } from "@/lib/decision-report";

export async function POST(req: NextRequest) {
  const session = await auth();
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const userId = session?.user?.id;
  const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

  const rl = await rateLimit(`decision-report:${userId || ip}`, 10);
  if (!rl.success) {
    return NextResponse.json({ error: "요청 한도 초과" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit);
  if (!daily.success) {
    return NextResponse.json({ error: "일일 사용 한도 초과" }, { status: 429, headers: rateLimitHeaders(daily) });
  }

  try {
    const body = await req.json();
    const { address, deposit, propertyPrice, propertyType, annualIncome, isFirstHome, transactionType } = body;

    if (!address || !deposit || !propertyPrice || !annualIncome) {
      return NextResponse.json(
        { error: "필수: address, deposit, propertyPrice, annualIncome" },
        { status: 400 },
      );
    }

    const result = generateDecisionReport({
      address,
      deposit,
      propertyPrice,
      propertyType: propertyType || "아파트",
      annualIncome,
      isFirstHome: isFirstHome ?? false,
      transactionType: transactionType || "JEONSE",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[DECISION-REPORT]", error);
    return NextResponse.json({ error: "리포트 생성 오류" }, { status: 500 });
  }
}
