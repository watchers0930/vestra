/**
 * 신용정보 조회 API
 * POST: 임대인/임차인 신용 조회
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";
import { createAuditLog } from "@/lib/audit-log";
import { checkCredit, type CreditCheckParams } from "@/lib/credit-api";

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`credit-check:${ip}`, 5);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과" },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, birthDate, purpose } = body as CreditCheckParams & {
      birthDate?: string;
    };

    // 유효성 검증
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "이름을 입력해주세요 (2자 이상)." },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "전화번호를 입력해주세요." },
        { status: 400 }
      );
    }

    if (
      !purpose ||
      !["landlord_check", "tenant_check", "self_check"].includes(purpose)
    ) {
      return NextResponse.json(
        {
          error:
            "조회 목적을 선택해주세요. (landlord_check, tenant_check, self_check)",
        },
        { status: 400 }
      );
    }

    const result = await checkCredit({
      name: name.trim(),
      phone: phone.trim(),
      birthDate,
      purpose,
    });

    // 감사 로그 (조회 내용은 마스킹)
    await createAuditLog({
      userId: session.user.id,
      action: "CREDIT_CHECK",
      detail: {
        purpose,
        provider: result.provider,
        grade: result.grade,
        riskLevel: result.riskLevel,
        // 이름/전화번호는 로그에 기록하지 않음 (개인정보 보호)
      },
      req,
    });

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `오류: ${message}` }, { status: 500 });
  }
}
