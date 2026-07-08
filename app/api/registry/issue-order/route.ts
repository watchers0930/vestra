import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit-log";
import { fetchRegistryDocumentByAddress, isTilkoRegistryDocAvailable } from "@/lib/tilko-api";
import { runAnalysisPipeline, sanitizeInput } from "@/app/api/analyze-unified/analyze-service";
import { recordRegistrySnapshot } from "@/lib/registry-snapshot-recorder";
import { createHash } from "crypto";

const ISSUE_PRICE = 1000;
const CONSENT_VERSION = "registry-issue-v1";

interface IssueOrderForExecution {
  id: string;
  userId: string;
  address: string;
  commUniqueNo: string | null;
  amount: number;
  status: string;
  provider: string;
  includeHistory: boolean;
  registerType: string;
  orderId: string;
  rawData: unknown;
}

function makeOrderId() {
  return `reg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getOrderMetadata(order: IssueOrderForExecution) {
  const raw = asRecord(order.rawData);
  const orderMeta = asRecord(raw.orderMeta || raw);
  const monitoredPropertyId =
    typeof orderMeta.monitoredPropertyId === "string" ? orderMeta.monitoredPropertyId : "";
  const realEstateType =
    typeof orderMeta.realEstateType === "string" ? orderMeta.realEstateType : undefined;
  const registryAddress =
    typeof orderMeta.registryAddress === "string" ? orderMeta.registryAddress : order.address;

  return { monitoredPropertyId, realEstateType, registryAddress };
}

async function executePaidOrder(params: {
  req: NextRequest;
  order: IssueOrderForExecution;
  ip: string;
}) {
  const { req, order, ip } = params;
  const { monitoredPropertyId, realEstateType, registryAddress } = getOrderMetadata(order);

  if (order.status === "issued") {
    return NextResponse.json(
      { error: "이미 발급 완료된 주문입니다.", order: { orderId: order.orderId, status: order.status } },
      { status: 409 }
    );
  }

  if (order.status !== "paid") {
    return NextResponse.json(
      {
        error: "결제 완료 후 발급할 수 있습니다.",
        order: {
          id: order.id,
          orderId: order.orderId,
          amount: order.amount,
          status: order.status,
          provider: order.provider,
        },
      },
      { status: 402 }
    );
  }

  if (!isTilkoRegistryDocAvailable()) {
    return NextResponse.json({ error: "틸코 등기부 조회 서비스가 설정되지 않았습니다." }, { status: 503 });
  }

  const monitoredProperty = monitoredPropertyId
    ? await prisma.monitoredProperty.findFirst({
        where: {
          id: monitoredPropertyId,
          userId: order.userId,
        },
        select: { id: true, baselineData: true, lastHash: true },
      })
    : null;

  if (monitoredPropertyId && !monitoredProperty) {
    return NextResponse.json({ error: "감시 물건을 찾을 수 없거나 권한이 없습니다." }, { status: 403 });
  }

  await prisma.registryIssueOrder.update({
    where: { id: order.id },
    data: { status: "issuing" },
  });

  try {
    const registry = await fetchRegistryDocumentByAddress({
      address: registryAddress,
    });

    const documentText = sanitizeInput(registry.text);
    const newHash = generateContentHash(documentText);
    let snapshotResult: Awaited<ReturnType<typeof recordRegistrySnapshot>> | null = null;

    if (monitoredProperty) {
      snapshotResult = await recordRegistrySnapshot({
        propertyId: monitoredProperty.id,
        fullText: documentText,
      });

      const changed = monitoredProperty.lastHash ? monitoredProperty.lastHash !== newHash : false;
      await prisma.monitoredProperty.update({
        where: { id: monitoredProperty.id },
        data: {
          lastHash: newHash,
          lastCheckedAt: new Date(),
          registrySignalStatus: changed ? "confirmed_changed" : "confirmed_no_change",
          ...(!monitoredProperty.baselineData ? { baselineData: documentText } : {}),
        },
      });
    }

    const analysisResult = await runAnalysisPipeline({
      rawText: documentText,
      address: order.address,
      inputSource: "tilko",
      ip,
    });

    const analysisAddress = order.address || analysisResult.propertyInfo.address || registry.address;
    const analysisSummary = `${analysisResult.riskScore?.grade || "?"}등급 (${analysisResult.riskScore?.gradeLabel || ""}, ${analysisResult.riskScore?.totalScore || 0}점) | 틸코 등기부 발급`;
    const analysisData = JSON.stringify({
      propertyInfo: analysisResult.propertyInfo,
      riskAnalysis: analysisResult.riskAnalysis,
      parsed: analysisResult.parsed,
      validation: analysisResult.validation,
      riskScore: analysisResult.riskScore,
      marketData: analysisResult.marketData,
      aiOpinion: analysisResult.aiOpinion,
      graphAnalysis: analysisResult.graphAnalysis,
      redemptionSimulation: analysisResult.redemptionSimulation,
      confidencePropagation: analysisResult.confidencePropagation,
      selfVerification: analysisResult.selfVerification,
      vScore: analysisResult.vScore,
      crossAnalysis: analysisResult.crossAnalysis,
      fraudRisk: analysisResult.fraudRisk,
      checklist: analysisResult.checklist,
      checklistByCategory: analysisResult.checklistByCategory,
      safetyDiagnosis: analysisResult.safetyDiagnosis,
      titleInsurance: analysisResult.titleInsurance,
      contractClauses: analysisResult.contractClauses,
      eventLog: analysisResult.eventLog,
      kaptInfo: analysisResult.kaptInfo,
      dataSource: {
        registryParsed: true,
        molitAvailable: !!analysisResult.marketData,
        inputSource: "tilko",
      },
    });

    const savedAnalysis = await prisma.analysis.create({
      data: {
        userId: order.userId,
        type: "rights",
        typeLabel: "권리분석",
        address: analysisAddress,
        summary: analysisSummary,
        data: analysisData,
        fraudRisk: JSON.parse(JSON.stringify(analysisResult.fraudRisk ?? null)),
        vScore: JSON.parse(JSON.stringify(analysisResult.vScore ?? null)),
      },
    });

    await prisma.asset.upsert({
      where: {
        userId_address: {
          userId: order.userId,
          address: analysisAddress,
        },
      },
      update: {
        type: analysisResult.propertyInfo.type || "부동산",
        estimatedPrice: analysisResult.propertyInfo.estimatedPrice || 0,
        jeonsePrice: analysisResult.propertyInfo.jeonsePrice || 0,
        safetyScore: analysisResult.riskAnalysis.safetyScore || 0,
        riskScore: analysisResult.riskAnalysis.riskScore || 0,
        lastAnalyzedDate: new Date(),
      },
      create: {
        userId: order.userId,
        address: analysisAddress,
        type: analysisResult.propertyInfo.type || "부동산",
        estimatedPrice: analysisResult.propertyInfo.estimatedPrice || 0,
        jeonsePrice: analysisResult.propertyInfo.jeonsePrice || 0,
        safetyScore: analysisResult.riskAnalysis.safetyScore || 0,
        riskScore: analysisResult.riskAnalysis.riskScore || 0,
      },
    });

    const issuedOrder = await prisma.registryIssueOrder.update({
      where: { id: order.id },
      data: {
        status: "issued",
        documentText,
        rawData: {
          orderMeta: getOrderMetadata(order),
          registry: JSON.parse(JSON.stringify(registry.rawData)),
        },
        issuedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: order.userId,
      action: "REGISTRY_ISSUE_COMPLETED",
      target: issuedOrder.id,
      detail: {
        orderId: issuedOrder.orderId,
        address: analysisAddress,
        registryAddress: registry.address,
        commUniqueNo: order.commUniqueNo,
        analysisId: savedAnalysis.id,
        monitoredPropertyId: monitoredProperty?.id,
        snapshotSequenceNo: snapshotResult?.sequenceNo,
        snapshotHash: snapshotResult?.snapshotHash,
        provider: "tilko",
      },
      req,
    });

    return NextResponse.json({
      order: {
        id: issuedOrder.id,
        orderId: issuedOrder.orderId,
        amount: issuedOrder.amount,
        status: issuedOrder.status,
        provider: issuedOrder.provider,
        issuedAt: issuedOrder.issuedAt,
      },
      registry: {
        text: documentText,
        address: registry.address,
        requestedAddress: order.address,
        source: "tilko",
      },
      snapshot: snapshotResult
        ? {
            sequenceNo: snapshotResult.sequenceNo,
            snapshotHash: snapshotResult.snapshotHash,
            changedSections: snapshotResult.changedSections,
            isFirstSnapshot: snapshotResult.isFirstSnapshot,
          }
        : null,
      analysis: {
        id: savedAnalysis.id,
        result: JSON.parse(analysisData),
      },
    });
  } catch (issueError) {
    const message = issueError instanceof Error ? issueError.message : "등기부 발급/분석 중 오류가 발생했습니다.";
    const failedOrder = await prisma.registryIssueOrder.update({
      where: { id: order.id },
      data: {
        status: "failed",
        errorMessage: message,
      },
    });

    await createAuditLog({
      userId: order.userId,
      action: "REGISTRY_ISSUE_FAILED",
      target: order.id,
      detail: {
        orderId: order.orderId,
        address: order.address,
        commUniqueNo: order.commUniqueNo,
        provider: "tilko",
        error: message,
      },
      req,
    });

    return NextResponse.json({
      error: "등기부 발급 또는 AI 분석에 실패했습니다.",
      detail: message,
      order: {
        id: failedOrder.id,
        orderId: failedOrder.orderId,
        status: failedOrder.status,
        provider: failedOrder.provider,
      },
    }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
    }

    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`registry-issue-order:${session.user.id || ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과" },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await req.json();
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const commUniqueNo = typeof body.commUniqueNo === "string" ? body.commUniqueNo.trim() : "";
    const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() : "";
    const purpose = typeof body.purpose === "string" ? body.purpose : "analysis";
    const includeHistory = body.includeHistory !== false;
    const accepted = body.acceptedTerms === true;
    const realEstateType = typeof body.realEstateType === "string" ? body.realEstateType : undefined;
    const registryAddress = typeof body.registryAddress === "string" ? body.registryAddress.trim() : address;
    const registerType = typeof body.registerType === "string" ? body.registerType : "0";
    const monitoredPropertyId = typeof body.monitoredPropertyId === "string" ? body.monitoredPropertyId : "";

    if (!address || address.length < 5) {
      return NextResponse.json({ error: "유효한 주소가 필요합니다." }, { status: 400 });
    }
    if (!ownerName) {
      return NextResponse.json({ error: "등기부 조회/발급을 위해 소유자명이 필요합니다." }, { status: 400 });
    }
    if (!accepted) {
      return NextResponse.json({ error: "등기부 조회/발급 및 개인정보 제공 동의가 필요합니다." }, { status: 400 });
    }

    const monitoredProperty = monitoredPropertyId
      ? await prisma.monitoredProperty.findFirst({
          where: {
            id: monitoredPropertyId,
            userId: session.user.id,
          },
          select: { id: true },
        })
      : null;

    if (monitoredPropertyId && !monitoredProperty) {
      return NextResponse.json({ error: "감시 물건을 찾을 수 없거나 권한이 없습니다." }, { status: 403 });
    }

    const order = await prisma.registryIssueOrder.create({
      data: {
        userId: session.user.id,
        address,
        commUniqueNo,
        ownerName,
        amount: ISSUE_PRICE,
        status: "payment_required",
        provider: "tilko",
        purpose,
        includeHistory,
        registerType,
        consentVersion: CONSENT_VERSION,
        orderId: makeOrderId(),
        rawData: {
          orderMeta: {
            monitoredPropertyId: monitoredProperty?.id ?? null,
            realEstateType: realEstateType ?? null,
            registryAddress,
          },
        },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "REGISTRY_ISSUE_ORDER_CREATED",
      target: order.id,
      detail: {
        orderId: order.orderId,
        address,
        registryAddress,
        commUniqueNo,
        amount: ISSUE_PRICE,
        status: "payment_required",
        provider: "tilko",
      },
      req,
    });

    return NextResponse.json({
      order: {
        id: order.id,
        orderId: order.orderId,
        amount: order.amount,
        status: order.status,
        provider: order.provider,
      },
      payment: {
        required: true,
        amount: order.amount,
        currency: "KRW",
      },
      message: "결제 대기 주문이 생성되었습니다. 결제 승인 후 등기부 발급이 실행됩니다.",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[registry/issue-order] ${message}`);
    return NextResponse.json({ error: "등기부 조회 신청 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
    }

    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`registry-issue-execute:${session.user.id || ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과" },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await req.json();
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";

    if (!orderId) {
      return NextResponse.json({ error: "주문번호가 필요합니다." }, { status: 400 });
    }

    const order = await prisma.registryIssueOrder.findFirst({
      where: {
        orderId,
        userId: session.user.id,
      },
      select: {
        id: true,
        userId: true,
        address: true,
        commUniqueNo: true,
        amount: true,
        status: true,
        provider: true,
        includeHistory: true,
        registerType: true,
        orderId: true,
        rawData: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없거나 권한이 없습니다." }, { status: 404 });
    }

    return executePaidOrder({ req, order, ip });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[registry/issue-order] ${message}`);
    return NextResponse.json({ error: "등기부 발급 실행 중 오류가 발생했습니다." }, { status: 500 });
  }
}
