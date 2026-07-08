/**
 * 모니터링 등록/조회 API
 * POST: 부동산 모니터링 등록
 * GET: 내 모니터링 목록 조회
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";
import { createAuditLog } from "@/lib/audit-log";
import { recordRegistrySnapshot } from "@/lib/registry-snapshot-recorder";
import { fetchRegistryDocumentByAddress, isTilkoRegistryDocAvailable, extractCommUniqueNoFromText } from "@/lib/tilko-api";
import { createHash } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`monitoring-list:${ip}`, 30);
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

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20")), 100);
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));
    const status = searchParams.get("status"); // active | paused | expired

    const where = {
      userId: session.user.id,
      ...(status ? { status } : {}),
    };

    const [properties, total] = await Promise.all([
      prisma.monitoredProperty.findMany({
        where,
        include: {
          alerts: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          _count: { select: { alerts: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.monitoredProperty.count({ where }),
    ]);

    return NextResponse.json({
      properties,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[monitoring] ${message}`);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`monitoring-add:${ip}`, 10);
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
    const { address, contractDate, moveInDate, deposit, commUniqueNo, ownerName, pdfRawText } = body;
    if (!address || typeof address !== "string" || address.trim().length < 5) {
      return NextResponse.json(
        { error: "유효한 주소를 입력해주세요." },
        { status: 400 }
      );
    }

    // contract_gap 모드: 계약일이 제공되면 강화 감시
    const monitorMode = contractDate ? "contract_gap" : "standard";

    // 중복 확인
    const existing = await prisma.monitoredProperty.findUnique({
      where: {
        userId_address: {
          userId: session.user.id,
          address: address.trim(),
        },
      },
    });

    if (existing) {
      if (existing.status === "active") {
        return NextResponse.json(
          { error: "이미 모니터링 중인 주소입니다." },
          { status: 409 }
        );
      }
      // 비활성 상태면 재활성화 (계약감시 모드 포함)
      const reactivated = await prisma.monitoredProperty.update({
        where: { id: existing.id },
        data: {
          status: "active",
          monitorMode,
          ...(contractDate ? { contractDate: new Date(contractDate) } : {}),
          ...(moveInDate ? { moveInDate: new Date(moveInDate) } : {}),
          ...(deposit ? { deposit: Number(deposit) } : {}),
          ...(commUniqueNo ? { commUniqueNo } : {}),
          ...(ownerName ? { ownerName: String(ownerName).trim() } : {}),
        },
      });
      if (pdfRawText && typeof pdfRawText === "string") {
        const pdfExtractedNo = (!reactivated.commUniqueNo && !commUniqueNo)
          ? extractCommUniqueNoFromText(pdfRawText) ?? undefined
          : undefined;
        const pdfHash = createHash("sha256").update(pdfRawText).digest("hex");
        await prisma.monitoredProperty.update({
          where: { id: reactivated.id },
          data: {
            ...(pdfExtractedNo ? { commUniqueNo: pdfExtractedNo } : {}),
            baselineData: pdfRawText,
            lastHash: pdfHash,
          },
        });
        recordRegistrySnapshot({ propertyId: reactivated.id, fullText: pdfRawText }).catch(() => {});
      }
      // 재활성화 시에도 commUniqueNo 없으면 Tilko 발급으로 보완
      if (!reactivated.commUniqueNo && !commUniqueNo && !pdfRawText && isTilkoRegistryDocAvailable()) {
        fetchRegistryDocumentByAddress({ address: address.trim() })
          .then(async (registry) => {
            const extractedNo = registry.commUniqueNo ?? extractCommUniqueNoFromText(registry.text) ?? undefined;
            const baselineHash = createHash("sha256").update(registry.text).digest("hex");
            await prisma.monitoredProperty.update({
              where: { id: reactivated.id },
              data: {
                ...(extractedNo ? { commUniqueNo: extractedNo } : {}),
                baselineData: registry.text,
                lastHash: baselineHash,
              },
            });
            await recordRegistrySnapshot({ propertyId: reactivated.id, fullText: registry.text });
          })
          .catch((e) => console.error(`[MONITORING] 재활성화 등기부 발급 실패: ${address.trim()}`, e instanceof Error ? e.message : e));
      }
      return NextResponse.json({ property: reactivated, reactivated: true });
    }

    // 모니터링 등록 제한 (역할별)
    const monitorCount = await prisma.monitoredProperty.count({
      where: { userId: session.user.id, status: "active" },
    });
    const limits: Record<string, number> = {
      GUEST: 1,
      PERSONAL: 3,
      BUSINESS: 10,
      REALESTATE: 30,
      ADMIN: 100,
    };
    const maxMonitors =
      limits[session.user.role as string] || limits.PERSONAL;
    if (monitorCount >= maxMonitors) {
      return NextResponse.json(
        {
          error: `모니터링 등록 한도(${maxMonitors}건)에 도달했습니다.`,
        },
        { status: 429 }
      );
    }

    const property = await prisma.monitoredProperty.create({
      data: {
        userId: session.user.id,
        address: address.trim(),
        monitorMode,
        ...(contractDate ? { contractDate: new Date(contractDate) } : {}),
        ...(moveInDate ? { moveInDate: new Date(moveInDate) } : {}),
        ...(deposit ? { deposit: Number(deposit) } : {}),
        ...(commUniqueNo ? { commUniqueNo } : {}),
        ...(ownerName ? { ownerName: String(ownerName).trim() } : {}),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "MONITORING_REGISTERED",
      target: property.id,
      detail: { address: address.trim() },
      req,
    });

    if (pdfRawText && typeof pdfRawText === "string") {
      const pdfExtractedNo = !commUniqueNo
        ? extractCommUniqueNoFromText(pdfRawText) ?? undefined
        : undefined;
      const pdfHash = createHash("sha256").update(pdfRawText).digest("hex");
      await prisma.monitoredProperty.update({
        where: { id: property.id },
        data: {
          ...(pdfExtractedNo ? { commUniqueNo: pdfExtractedNo } : {}),
          baselineData: pdfRawText,
          lastHash: pdfHash,
        },
      });
      recordRegistrySnapshot({ propertyId: property.id, fullText: pdfRawText }).catch(() => {});
    }

    // 최초 등록 시 Tilko 등기부 발급 → commUniqueNo 추출 + baseline 저장
    // commUniqueNo가 이미 있거나(PDF 등록) pdfRawText가 있으면 스킵
    if (!commUniqueNo && !pdfRawText && isTilkoRegistryDocAvailable()) {
      try {
        const registry = await fetchRegistryDocumentByAddress({ address: address.trim() });
        const extractedNo = registry.commUniqueNo ?? extractCommUniqueNoFromText(registry.text) ?? undefined;
        const baselineHash = createHash("sha256").update(registry.text).digest("hex");

        await prisma.monitoredProperty.update({
          where: { id: property.id },
          data: {
            ...(extractedNo ? { commUniqueNo: extractedNo } : {}),
            baselineData: registry.text,
            lastHash: baselineHash,
          },
        });

        await recordRegistrySnapshot({ propertyId: property.id, fullText: registry.text });

        console.log(`[MONITORING] 최초 등기부 발급 완료: ${address.trim()}${extractedNo ? ` / 고유번호: ${extractedNo}` : ""}`);
      } catch (e) {
        // 발급 실패해도 등록 자체는 완료 — 크론에서 재시도 가능
        console.error(`[MONITORING] 최초 등기부 발급 실패 (등록은 완료): ${address.trim()}`, e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[monitoring] ${message}`);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`monitoring-del:${ip}`, 10);
    if (!rl.success) {
      return NextResponse.json({ error: "요청 한도 초과" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    if (!address || address.trim().length < 5) {
      return NextResponse.json({ error: "유효한 주소를 입력해주세요." }, { status: 400 });
    }

    const updated = await prisma.monitoredProperty.updateMany({
      where: { userId: session.user.id, address: address.trim(), status: "active" },
      data: { status: "paused" },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "모니터링 중인 항목이 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[monitoring] ${message}`);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
