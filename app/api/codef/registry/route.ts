import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { fetchRegistry, isCodefAvailable } from "@/lib/codef-api";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    if (!isCodefAvailable()) {
      return NextResponse.json(
        { error: "등기부 공식 연계 조회 서비스가 설정되지 않았습니다." },
        { status: 503 },
      );
    }

    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    // 분당 rate limit (비용 발생 API이므로 더 제한적)
    const rl = await rateLimit(`codef-registry:${userId || ip}`, 5);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    // 일일 사용량 체크
    const daily = await checkDailyUsage(
      userId || `guest:${ip}`,
      dailyLimit,
      "codef-registry",
    );
    if (!daily.success) {
      return NextResponse.json(
        { error: "일일 등기부 조회 한도를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(daily) },
      );
    }

    const { reqAddress, commUniqueNo, realEstateType, registerType } = await req.json();

    if (!reqAddress || !commUniqueNo) {
      return NextResponse.json(
        { error: "부동산 주소와 고유번호가 모두 필요합니다." },
        { status: 400 },
      );
    }

    const result = await fetchRegistry({
      reqAddress,
      commUniqueNo,
      realEstateType,
      registerType,
    });

    return NextResponse.json({
      text: result.text,
      registerType: result.registerType,
      uniqueNo: result.uniqueNo,
      address: result.address,
      source: "codef",
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "CODEF_CLIENT_NOT_FOUND") {
      console.error("[등기부등본 공식 연계 조회] CODEF client id가 유효하지 않습니다.");
      return NextResponse.json(
        { error: "등기부 공식 연계 조회 인증키 확인이 필요합니다. 파일 업로드 또는 텍스트 입력으로 분석을 진행해주세요." },
        { status: 503 },
      );
    }
    return handleApiError(error, "등기부등본 공식 연계 조회");
  }
}
