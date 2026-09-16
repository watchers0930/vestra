/**
 * 임대인 물건 추적 API
 * 등기부에서 추출한 소유자명으로 동일 소유자의 다른 물건을 조회하고
 * 종합 위험 프로파일을 반환한다.
 *
 * v2: MOLIT 실거래가 API로 추정 시세 조회 (하드코딩 제거)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import {
  buildLandlordProfile,
  assessPropertyRisk,
  type LandlordProperty,
} from "@/lib/landlord-profiler";
import { fetchRecentPrices } from "@/lib/molit-api";
import { searchCourtCases } from "@/lib/court-api";
import { validateOrigin } from "@/lib/csrf";

/**
 * 주소 기반으로 MOLIT 실거래가 API에서 추정 시세를 조회
 * - 최근 6개월 거래 데이터의 평균가를 사용
 * - 아파트명이 주소에 포함되어 있으면 해당 아파트만 필터링
 */
async function estimatePriceFromMolit(address: string): Promise<number> {
  try {
    const result = await fetchRecentPrices(address, 6);
    if (!result || result.transactions.length === 0) return 0;

    // 주소에서 아파트명 추출 시도 (예: "철산한신 아파트" → "철산한신")
    const aptNameMatch = address.match(/([가-힣]+(?:아파트|APT|apt))/);
    const aptKeyword = aptNameMatch
      ? aptNameMatch[1].replace(/아파트|APT|apt/gi, "").trim()
      : null;

    let filtered = result.transactions;

    // 아파트명이 있으면 해당 아파트만 필터
    if (aptKeyword && aptKeyword.length >= 2) {
      const aptFiltered = result.transactions.filter((t) =>
        t.aptName?.includes(aptKeyword)
      );
      if (aptFiltered.length > 0) {
        filtered = aptFiltered;
      }
    }

    // 최근 거래 기준 평균가 산출
    const prices = filtered.map((t) => t.dealAmount);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    return avgPrice;
  } catch (err) {
    console.error("[landlord:estimatePrice] MOLIT 조회 실패:", err);
    return 0;
  }
}

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
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const { ownerName, baseAddress } = await req.json();

    if (!ownerName) {
      return NextResponse.json({ error: "ownerName이 필요합니다." }, { status: 400 });
    }

    // 실 데이터만 사용: 기준 주소가 있으면 MOLIT 실거래가로 추정 시세를 조회한다.
    // (하드코딩 시드 데이터 제거 — 가짜 물건이 실제 위험 프로파일로 노출되던 문제 해결)
    let properties: LandlordProperty[] = [];
    if (baseAddress) {
      const estimatedPrice = await estimatePriceFromMolit(baseAddress);
      properties = [{
        address: baseAddress,
        mortgageTotal: 0,
        liensTotal: 0,
        estimatedPrice,
        riskLevel: assessPropertyRisk(0, 0, estimatedPrice),
      }];
    }

    // 법제처 Open API 판례 검색 (LAW_API_KEY 없으면 graceful fallback으로 0 반환)
    let courtCaseCount = 0;
    try {
      const cases = await searchCourtCases(`${ownerName.trim()} 전세보증금`, 10);
      courtCaseCount = cases.length;
    } catch {
      // API 키 미설정 또는 외부 오류 시 0 유지
    }

    const profile = await buildLandlordProfile(ownerName, properties, courtCaseCount);

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[LANDLORD:TRACK]", error);
    return NextResponse.json(
      { error: "임대인 추적 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
