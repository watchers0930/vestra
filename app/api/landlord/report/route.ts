/**
 * 임대인 사기 제보 API
 * POST: 사용자 제보를 FraudCase 테이블에 저장 (source: user_report, verified: false)
 * Rate limit: IP당 일 3건
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

const CASE_TYPES = ["jeonse_fraud", "deposit_fraud", "rental_fraud", "other"];

export async function POST(request: NextRequest) {
  // IP 기반 rate limit (일 3건)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rateLimitKey = `landlord-report:${ip}`;
  const rl = await rateLimit(rateLimitKey, 3, 24 * 60 * 60 * 1000); // 24시간 윈도우

  if (!rl.success) {
    return NextResponse.json(
      { error: "일일 제보 한도(3건)를 초과했습니다. 내일 다시 시도해 주세요." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const body = await request.json();
    const { landlordName, address, caseType, amount, description, contactEmail } = body;

    // 유효성 검사
    if (!landlordName?.trim() || !address?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: "임대인명, 물건주소, 설명은 필수 항목입니다." },
        { status: 400 }
      );
    }

    if (!CASE_TYPES.includes(caseType)) {
      return NextResponse.json(
        { error: "유효하지 않은 사기 유형입니다." },
        { status: 400 }
      );
    }

    if (description.trim().length < 10) {
      return NextResponse.json(
        { error: "설명은 최소 10자 이상 입력해 주세요." },
        { status: 400 }
      );
    }

    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json(
        { error: "유효한 이메일 형식을 입력해 주세요." },
        { status: 400 }
      );
    }

    // FraudCase 생성
    const fraudCase = await prisma.fraudCase.create({
      data: {
        address: address.trim(),
        latitude: 0, // 추후 geocoding 연동
        longitude: 0,
        caseType,
        amount: amount ? Number(amount) : null,
        reportDate: new Date(),
        source: "user_report",
        verified: false,
        summary: JSON.stringify({
          landlordName: landlordName.trim(),
          description: description.trim(),
          contactEmail: contactEmail?.trim() || null,
          reporterIp: ip,
        }),
      },
    });

    return NextResponse.json(
      { success: true, id: fraudCase.id },
      { status: 201, headers: rateLimitHeaders(rl) }
    );
  } catch (error) {
    console.error("[landlord/report] Error:", error);
    return NextResponse.json(
      { error: "제보 접수 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
