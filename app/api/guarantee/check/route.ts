/**
 * 보증보험 가입 가능 여부 독립 API
 * 물건 정보만으로 HUG/HF/SGI 가입 가능 여부 + 예상 보험료 즉시 판단
 */

import { NextRequest, NextResponse } from "next/server";
import { checkGuaranteeInsurance, type GuaranteeInput } from "@/lib/guarantee-insurance";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { auth, ROLE_LIMITS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const userId = session?.user?.id;
  const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

  // Rate limit
  const rl = await rateLimit(`guarantee-check:${userId || ip}`, 20);
  if (!rl.success) {
    return NextResponse.json(
      { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  // FREE 무제한 타입
  const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit, "guarantee-check");
  if (!daily.success) {
    return NextResponse.json(
      { error: "일일 사용 한도를 초과했습니다." },
      { status: 429, headers: rateLimitHeaders(daily) },
    );
  }

  try {
    const body = await req.json();
    const {
      deposit,
      propertyPrice,
      seniorLiens = 0,
      propertyType = "아파트",
      isMetro = true,
      contractStartDate,
      contractEndDate,
      hasJeonseLoan = false,
    } = body;

    if (!deposit || !propertyPrice || !contractStartDate || !contractEndDate) {
      return NextResponse.json(
        { error: "필수 항목: deposit, propertyPrice, contractStartDate, contractEndDate" },
        { status: 400 },
      );
    }

    const input: GuaranteeInput = {
      deposit,
      propertyPrice,
      seniorLiens,
      propertyType,
      isMetro,
      contractStartDate,
      contractEndDate,
      hasJeonseLoan,
    };

    const result = await checkGuaranteeInsurance(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GUARANTEE:CHECK]", error);
    return NextResponse.json(
      { error: "보증보험 가입 판단 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
