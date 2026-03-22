import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";
import { fetchComprehensivePrices } from "@/lib/molit-api";
import { estimatePrice } from "@/lib/price-estimation";
import { predictValue } from "@/lib/prediction-engine";
import { auth, ROLE_LIMITS } from "@/lib/auth";

const MAX_ADDRESSES = 3;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    const rl = await rateLimit(`predict-compare:${userId || ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit);
    if (!daily.success) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다." },
        { status: 429, headers: rateLimitHeaders(daily) }
      );
    }

    const { addresses: rawAddresses } = await req.json();

    if (!Array.isArray(rawAddresses) || rawAddresses.length === 0) {
      return NextResponse.json({ error: "주소 배열을 입력해주세요." }, { status: 400 });
    }

    const addresses = rawAddresses
      .slice(0, MAX_ADDRESSES)
      .map((a: unknown) => sanitizeField(String(a || ""), 200))
      .filter(Boolean);

    if (addresses.length === 0) {
      return NextResponse.json({ error: "유효한 주소가 없습니다." }, { status: 400 });
    }

    const comparisons = await Promise.all(
      addresses.map(async (address) => {
        try {
          const comprehensive = await fetchComprehensivePrices(address, 12).catch(() => null);
          const priceEstimation = estimatePrice(
            { address, aptName: address },
            comprehensive?.sale ?? null,
            comprehensive?.rent ?? null,
          );
          const currentPrice = priceEstimation.estimatedPrice;
          const prediction = predictValue(
            currentPrice,
            comprehensive?.sale?.transactions ?? [],
            comprehensive?.rent ?? null,
            comprehensive?.jeonseRatio ?? null,
          );

          return {
            address,
            currentPrice,
            predictions: prediction.predictions,
            confidence: prediction.confidence,
          };
        } catch {
          return { address, currentPrice: 0, predictions: null, confidence: 0, error: "분석 실패" };
        }
      })
    );

    return NextResponse.json({ comparisons });
  } catch (error: unknown) {
    return handleApiError(error, "시세 비교");
  }
}
