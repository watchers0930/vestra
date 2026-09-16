/**
 * 등기부 자동발급 주문 — 서비스 로직
 * ────────────────────────────────────
 * route(app/api/registry/issue-order)에서 분리. 결제 완료 주문의 등기부 발급 →
 * 스냅샷 기록 → 권리분석 파이프라인 → 자산/분석 저장 오케스트레이션을 담당.
 *
 * ⚠️ [보류 — 2026-09-14] 틸코 자동발급은 보류(REGISTRY_ISSUE_SUSPENDED). 로직은 보존.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { fetchRegistryDocumentByAddress, isTilkoRegistryDocAvailable } from "@/lib/tilko-api";
import { runAnalysisPipeline, sanitizeInput } from "@/app/api/analyze-unified/analyze-service";
import { recordRegistrySnapshot } from "@/lib/registry-snapshot-recorder";
import { createHash } from "crypto";

export const ISSUE_PRICE = 1000;
export const CONSENT_VERSION = "registry-issue-v1";

// ⚠️ [보류 — 2026-09-14] 틸코 자동발급을 잠시 보류(이용자 직접 발급으로 운영).
// 기존 발급 로직은 삭제하지 않고 그대로 보존한다. 복구 시 이 플래그만 false 로 바꾸면 즉시 재개.
export const REGISTRY_ISSUE_SUSPENDED = true;
export const SUSPENDED_MESSAGE =
  "등기부 자동발급은 현재 보류 중입니다. 인터넷등기소(iros.go.kr)에서 직접 발급해 주세요.";

function extractCurrentOwner(gapgu: Array<{ purpose: string; holder: string; isCancelled: boolean }>): string {
  const active = [...gapgu]
    .reverse()
    .find((e) => !e.isCancelled && (e.purpose.includes("소유권") || e.holder));
  return active?.holder?.trim() || "";
}

function maskOwnerName(name: string): string {
  if (!name) return "**";
  return name[0] + "*".repeat(Math.max(name.length - 1, 1));
}

function normalizeOwner(name: string): string {
  return name.replace(/\s+/g, "").replace(/[()（）]/g, "");
}

function compareOwnerNames(input: string, registry: string): boolean {
  const a = normalizeOwner(input);
  const b = normalizeOwner(registry);
  if (!a || !b) return false;
  return a === b || b.includes(a) || a.includes(b);
}

export interface IssueOrderForExecution {
  id: string;
  userId: string;
  address: string;
  commUniqueNo: string | null;
  ownerName: string | null;
  amount: number;
  status: string;
  provider: string;
  includeHistory: boolean;
  registerType: string;
  orderId: string;
  rawData: unknown;
}

export function makeOrderId() {
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

export async function executePaidOrder(params: {
  req: NextRequest;
  order: IssueOrderForExecution;
  ip: string;
}) {
  const { req, order, ip } = params;
  const { monitoredPropertyId, registryAddress } = getOrderMetadata(order);

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

  // 낙관적 잠금: paid → issuing 원자적 전이. 위 status 사전검사는 read-check-write라
  // 동시 요청 2건이 모두 통과해 이중발급(이중 과금·이중 분석)될 수 있다.
  // 조건부 updateMany의 count로 딱 하나만 선점하게 만든다.
  const claimed = await prisma.registryIssueOrder.updateMany({
    where: { id: order.id, status: "paid" },
    data: { status: "issuing" },
  });
  if (claimed.count === 0) {
    return NextResponse.json(
      { error: "이미 처리 중이거나 발급된 주문입니다.", order: { orderId: order.orderId } },
      { status: 409 }
    );
  }

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

    const registryOwner = extractCurrentOwner(analysisResult.parsed?.gapgu || []);
    const ownerMatch = compareOwnerNames(order.ownerName || "", registryOwner);
    const registryOwnerMasked = maskOwnerName(registryOwner);

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
      ownerMatch,
      registryOwnerMasked,
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
