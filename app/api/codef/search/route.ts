import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { searchAddress, isCodefAvailable } from "@/lib/codef-api";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    if (!isCodefAvailable()) {
      return NextResponse.json(
        { error: "CODEF API가 설정되지 않았습니다." },
        { status: 503 },
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`codef-search:${ip}`, 20);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const address = req.nextUrl.searchParams.get("address");
    if (!address || address.trim().length < 2) {
      return NextResponse.json(
        { error: "검색할 주소를 입력해주세요. (최소 2자)" },
        { status: 400 },
      );
    }

    const results = await searchAddress(address.trim());

    return NextResponse.json({
      results,
      count: results.length,
      query: address,
    });
  } catch (error: unknown) {
    return handleApiError(error, "CODEF 주소 검색");
  }
}
