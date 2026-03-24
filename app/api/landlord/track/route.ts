/**
 * 임대인 물건 추적 API
 * 등기부에서 추출한 소유자명으로 동일 소유자의 다른 물건을 조회하고
 * 종합 위험 프로파일을 반환한다.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import {
  buildLandlordProfile,
  assessPropertyRisk,
  type LandlordProperty,
} from "@/lib/landlord-profiler";

// 시드 데이터: 소유자별 물건 목록 (실 데이터 연동 전)
// TODO: MOLIT 등기부 API 또는 한국평가데이터 API 연동
const SEED_OWNERS: Record<string, LandlordProperty[]> = {
  "김영수": [
    { address: "서울특별시 강남구 압구정동 123", mortgageTotal: 350_000_000, liensTotal: 0, estimatedPrice: 1_200_000_000, riskLevel: "MEDIUM" },
    { address: "서울특별시 서초구 반포동 456", mortgageTotal: 500_000_000, liensTotal: 0, estimatedPrice: 900_000_000, riskLevel: "HIGH" },
    { address: "서울특별시 마포구 상암동 789", mortgageTotal: 120_000_000, liensTotal: 0, estimatedPrice: 650_000_000, riskLevel: "LOW" },
  ],
  "이정희": [
    { address: "서울특별시 송파구 잠실동 101", mortgageTotal: 200_000_000, liensTotal: 50_000_000, estimatedPrice: 800_000_000, riskLevel: "HIGH" },
    { address: "서울특별시 강동구 천호동 202", mortgageTotal: 150_000_000, liensTotal: 0, estimatedPrice: 550_000_000, riskLevel: "MEDIUM" },
  ],
  "박지민": [
    { address: "서울특별시 용산구 이촌동 303", mortgageTotal: 80_000_000, liensTotal: 0, estimatedPrice: 1_500_000_000, riskLevel: "LOW" },
  ],
};

export async function POST(req: NextRequest) {
  const session = await auth();
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const userId = session?.user?.id;
  const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

  const rl = await rateLimit(`landlord-track:${userId || ip}`, 10);
  if (!rl.success) {
    return NextResponse.json({ error: "요청 한도 초과" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit, "analyze-rights");
  if (!daily.success) {
    return NextResponse.json({ error: "일일 사용 한도 초과" }, { status: 429, headers: rateLimitHeaders(daily) });
  }

  try {
    const { ownerName, baseAddress } = await req.json();

    if (!ownerName) {
      return NextResponse.json({ error: "ownerName이 필요합니다." }, { status: 400 });
    }

    // 시드 데이터에서 조회 (실 연동 시 MOLIT API 교체)
    let properties = SEED_OWNERS[ownerName.trim()];

    if (!properties) {
      // 시드에 없으면 기본 물건 1건 (입력된 주소)
      properties = baseAddress
        ? [{
            address: baseAddress,
            mortgageTotal: 0,
            liensTotal: 0,
            estimatedPrice: 500_000_000,
            riskLevel: assessPropertyRisk(0, 0, 500_000_000),
          }]
        : [];
    }

    // 위험도 재계산
    properties = properties.map((p) => ({
      ...p,
      riskLevel: assessPropertyRisk(p.mortgageTotal, p.liensTotal, p.estimatedPrice),
    }));

    const profile = await buildLandlordProfile(ownerName, properties);

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[LANDLORD:TRACK]", error);
    return NextResponse.json(
      { error: "임대인 추적 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
