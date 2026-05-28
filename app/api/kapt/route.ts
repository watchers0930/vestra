import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { sanitizeField } from "@/lib/sanitize";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { findKaptCode, fetchKaptBasicInfo, fetchKaptDetailInfo } from "@/lib/kapt-api";
import { validateOrigin } from "@/lib/csrf";

/**
 * GET /api/kapt?address=서울시 강남구 역삼동 래미안
 *
 * 주소로 K-apt 단지코드 자동 매칭 후 기본정보 + 상세정보 반환.
 */
export async function GET(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`kapt:${ip}`, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const rawAddress = req.nextUrl.searchParams.get("address") || "";
    const address = sanitizeField(rawAddress, 200);

    if (!address || address.length < 2) {
      return NextResponse.json(
        { error: "주소를 입력해주세요. (최소 2자)" },
        { status: 400 }
      );
    }

    const kaptCode = await findKaptCode(address);
    if (!kaptCode) {
      return NextResponse.json(
        { error: "해당 주소의 K-apt 단지를 찾을 수 없습니다.", kaptCode: null },
        { status: 404 }
      );
    }

    const [basicInfo, detailInfo] = await Promise.all([
      fetchKaptBasicInfo(kaptCode),
      fetchKaptDetailInfo(kaptCode),
    ]);

    return NextResponse.json({
      kaptCode,
      basicInfo,
      detailInfo,
    });
  } catch (error: unknown) {
    return handleApiError(error, "K-apt 조회");
  }
}
