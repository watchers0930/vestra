import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { fetchRegistryDocumentByAddress, isTilkoRegistryDocAvailable } from "@/lib/tilko-api";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";

// ⚠️ [보류 — 2026-09-14] 틸코 등기부 원문 조회(발급 계열) 보류. 이용자 직접 발급으로 운영.
// 로직은 보존. 복구 시 이 플래그만 false 로.
const REGISTRY_DOC_SUSPENDED = true;

export async function POST(req: NextRequest) {
  try {
    if (REGISTRY_DOC_SUSPENDED) {
      return NextResponse.json(
        { error: "등기부 자동조회는 현재 보류 중입니다. 인터넷등기소(iros.go.kr)에서 직접 발급해 주세요." },
        { status: 503 }
      );
    }

    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    if (!isTilkoRegistryDocAvailable()) {
      return NextResponse.json(
        { error: "틸코 등기부등본 API가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const session = await auth();
    const userId = session?.user?.id;
    // 등기부 원문 조회는 민감정보 반환 + 유료 포인트 차감 → 로그인 필수
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const rl = await rateLimit(`tilko-registry-doc:${userId}`, 5);
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
