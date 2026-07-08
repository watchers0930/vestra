import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { fetchRegistryDocumentByAddress, isTilkoRegistryDocAvailable } from "@/lib/tilko-api";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    if (!isTilkoRegistryDocAvailable()) {
      return NextResponse.json(
        { error: "틸코 등기부등본 API가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;

    const rl = await rateLimit(`tilko-registry-doc:${userId || ip}`, 5);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { address, realClsCd, registryGubun } = await req.json();

    if (!address || String(address).trim().length < 4) {
      return NextResponse.json(
        { error: "주소가 필요합니다. (최소 4자)" },
        { status: 400 }
      );
    }

    const result = await fetchRegistryDocumentByAddress({
      address: String(address).trim(),
      realClsCd,
      registryGubun,
    });

    return NextResponse.json({
      text: result.text,
      address: result.address,
      source: "tilko",
    });
  } catch (error: unknown) {
    return handleApiError(error, "틸코 등기부등본 조회");
  }
}
