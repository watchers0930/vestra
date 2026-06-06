import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { fetchComprehensivePrices } from "@/lib/molit-api";
import { fetchBaseRate } from "@/lib/bok-api";
import { fetchBuildingInfoByAddress } from "@/lib/building-api";
import { fetchSupplyVolume } from "@/lib/supply-api";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { fetchKaptInfoByAddress } from "@/lib/kapt-api";
import { sanitizeInput, runAnalysisPipeline } from "./analyze-service";

// ─── GET: 주소 기반 원스톱 통합 데이터 조회 ───

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";

    const rl = await rateLimit(`analyze-unified-get:${ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address || address.trim().length < 2) {
      return NextResponse.json(
        { error: "address 파라미터가 필요합니다. (최소 2자)" },
        { status: 400 }
      );
    }

    // 5개 API 병렬 호출
    const [priceResult, rateResult, buildingResult, supplyResult, kaptInfo] =
      await Promise.all([
        fetchComprehensivePrices(address, 12).catch((e) => {
          console.warn("시세 조회 실패:", e);
          return null;
        }),
        fetchBaseRate().catch((e) => {
          console.warn("금리 조회 실패:", e);
          return null;
        }),
        fetchBuildingInfoByAddress(address).catch((e) => {
          console.warn("건물정보 조회 실패:", e);
          return null;
        }),
        fetchSupplyVolume(address).catch((e) => {
          console.warn("공급량 조회 실패:", e);
          return null;
        }),
        fetchKaptInfoByAddress(address).catch((e) => {
          console.warn("K-apt 단지정보 조회 실패:", e);
          return null;
        }),
      ]);

    const dataSources = {
      price: !!priceResult?.sale,
      rent: !!priceResult?.rent,
      baseRate: !!rateResult,
      building: !!buildingResult,
      supply: !!supplyResult,
      kapt: !!kaptInfo,
    };

    const availableCount = Object.values(dataSources).filter(Boolean).length;

    return NextResponse.json({
      address,
      timestamp: new Date().toISOString(),
      dataSources,
      availableCount,
      price: priceResult
        ? {
            sale: priceResult.sale
              ? {
                  avgPrice: priceResult.sale.avgPrice,
                  minPrice: priceResult.sale.minPrice,
                  maxPrice: priceResult.sale.maxPrice,
                  transactionCount: priceResult.sale.transactionCount,
                  period: priceResult.sale.period,
                  recentTransactions: priceResult.sale.transactions.slice(0, 5),
                  filterLevel: priceResult.sale.filterLevel,
                  totalBeforeFilter: priceResult.sale.totalBeforeFilter,
                }
              : null,
            rent: priceResult.rent
              ? {
                  avgDeposit: priceResult.rent.avgDeposit,
                  jeonseCount: priceResult.rent.jeonseCount,
                  wolseCount: priceResult.rent.wolseCount,
                  period: priceResult.rent.period,
                }
              : null,
            jeonseRatio: priceResult.jeonseRatio,
          }
        : null,
      baseRate: rateResult,
      building: buildingResult,
      supply: supplyResult,
      kaptInfo: kaptInfo ? {
        kaptName: kaptInfo.kaptName,
        constructorName: kaptInfo.constructorName,
        corridorType: kaptInfo.corridorType,
        heatingType: kaptInfo.heatingType,
        households: kaptInfo.households,
        dongCount: kaptInfo.dongCount,
        cctvCount: kaptInfo.cctvCount,
        parkingTotal: kaptInfo.parkingTotal,
        elevatorCount: kaptInfo.elevatorCount,
        evChargerCount: kaptInfo.evChargerCount,
        approvalDate: kaptInfo.approvalDate,
      } : null,
    });
  } catch (error: unknown) {
    return handleApiError(error, "통합 분석");
  }
}

// ─── POST: 등기부등본 기반 심층 통합 분석 ───

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    const rl = await rateLimit(`analyze-unified:${userId || ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit, "analyze-rights");
    if (!daily.success) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다. 로그인하여 더 많이 분석하세요." },
        { status: 429, headers: rateLimitHeaders(daily) }
      );
    }

    const { rawText: rawInput, estimatedPrice: userPrice, address: userAddress, source: inputSource } = await req.json();

    const rawText = sanitizeInput(rawInput);

    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json(
        { error: "등기부등본 텍스트를 입력해주세요." },
        { status: 400 }
      );
    }

    // 분석 파이프라인 실행
    const result = await runAnalysisPipeline({
      rawText,
      userPrice,
      address: userAddress || "",
      inputSource,
      ip,
    });

    return NextResponse.json({
      propertyInfo: result.propertyInfo,
      riskAnalysis: result.riskAnalysis,
      parsed: result.parsed,
      validation: result.validation,
      riskScore: result.riskScore,
      marketData: result.marketData,
      aiOpinion: result.aiOpinion,
      graphAnalysis: result.graphAnalysis,
      redemptionSimulation: result.redemptionSimulation,
      confidencePropagation: result.confidencePropagation,
      selfVerification: result.selfVerification,
      vScore: result.vScore,
      crossAnalysis: result.crossAnalysis,
      fraudRisk: result.fraudRisk,
      checklist: result.checklist,
      checklistByCategory: result.checklistByCategory,
      safetyDiagnosis: result.safetyDiagnosis,
      titleInsurance: result.titleInsurance,
      contractClauses: result.contractClauses,
      eventLog: result.eventLog,
      kaptInfo: result.kaptInfo ? {
        kaptName: result.kaptInfo.kaptName,
        constructorName: result.kaptInfo.constructorName,
        corridorType: result.kaptInfo.corridorType,
        heatingType: result.kaptInfo.heatingType,
        cctvCount: result.kaptInfo.cctvCount,
        parkingTotal: result.kaptInfo.parkingTotal,
        elevatorCount: result.kaptInfo.elevatorCount,
        evChargerCount: result.kaptInfo.evChargerCount,
        convFacilities: result.kaptInfo.convFacilities,
        eduFacilities: result.kaptInfo.eduFacilities,
        unitsByArea: result.kaptInfo.unitsByArea,
      } : null,
      dataSource: {
        registryParsed: true,
        molitAvailable: !!result.marketData,
        molitFiltered: result.marketDataFiltered,
        estimatedPriceSource: userPrice ? "user" : result.marketData?.sale?.avgPrice ? "molit" : "none",
        inputSource: result.inputSource || "manual",
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, "통합 분석");
  }
}
