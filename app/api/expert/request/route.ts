import { NextRequest, NextResponse } from "next/server";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Expert Consultation Request API
// ---------------------------------------------------------------------------

interface ConsultRequest {
  type: string;
  address: string;
  content: string;
  attachAiResult?: boolean;
  contactPhone?: string;
  contactEmail?: string;
}

const VALID_TYPES = [
  "전세 안전 검증",
  "등기부 해석",
  "세금 상담",
  "계약서 검토",
];

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const rl = await rateLimit(`expert-req:${ip}`, 5, 86400000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "일일 상담 요청 한도(5건)를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const body: ConsultRequest = await req.json();

    // Validation
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: "유효하지 않은 상담 유형입니다" },
        { status: 400 }
      );
    }

    if (!body.address || body.address.trim().length < 5) {
      return NextResponse.json(
        { error: "물건 주소를 5자 이상 입력해주세요" },
        { status: 400 }
      );
    }

    if (!body.content || body.content.trim().length < 10) {
      return NextResponse.json(
        { error: "문의 내용을 10자 이상 입력해주세요" },
        { status: 400 }
      );
    }

    if (!body.contactPhone && !body.contactEmail) {
      return NextResponse.json(
        { error: "연락처(전화번호 또는 이메일)를 입력해주세요" },
        { status: 400 }
      );
    }

    // In production, save to DB (Prisma). For now, log and return success.
    console.log("[Expert Request]", {
      type: body.type,
      address: body.address,
      contentLength: body.content.length,
      attachAiResult: body.attachAiResult ?? false,
      hasPhone: !!body.contactPhone,
      hasEmail: !!body.contactEmail,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "상담 요청이 접수되었습니다. 전문가 배정 후 24시간 내 연락드립니다.",
      requestId: `EXP-${Date.now().toString(36).toUpperCase()}`,
    });
  } catch {
    return NextResponse.json(
      { error: "요청 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
