import { NextRequest, NextResponse } from "next/server";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { simulateLoan, type LoanSimulateInput } from "@/lib/loan-simulator";

export async function POST(req: NextRequest) {
  const session = await auth();
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const userId = session?.user?.id;
  const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

  const rl = await rateLimit(`loan-sim:${userId || ip}`, 15);
  if (!rl.success) {
    return NextResponse.json({ error: "요청 한도 초과" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit, "loan-simulate");
  if (!daily.success) {
    return NextResponse.json({ error: "일일 사용 한도 초과" }, { status: 429, headers: rateLimitHeaders(daily) });
  }

  try {
    const body = await req.json();
    const { deposit, propertyPrice, propertyType, propertyAddress, annualIncome, creditScore, existingLoans, isFirstHome } = body;

    if (!deposit || !propertyPrice || !annualIncome) {
      return NextResponse.json(
        { error: "필수: deposit, propertyPrice, annualIncome" },
        { status: 400 },
      );
    }

    const input: LoanSimulateInput = {
      deposit,
      propertyPrice,
      propertyType: propertyType || "아파트",
      propertyAddress: propertyAddress || "",
      annualIncome,
      creditScore,
      existingLoans,
      isFirstHome: isFirstHome ?? false,
    };

    const result = simulateLoan(input);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[LOAN:SIMULATE]", error);
    return NextResponse.json({ error: "대출 시뮬레이션 오류" }, { status: 500 });
  }
}
