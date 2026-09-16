import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit-log";
import {
  ISSUE_PRICE,
  CONSENT_VERSION,
  REGISTRY_ISSUE_SUSPENDED,
  SUSPENDED_MESSAGE,
  makeOrderId,
  executePaidOrder,
} from "@/lib/registry-issue-service";

export async function POST(req: NextRequest) {
  try {
    if (REGISTRY_ISSUE_SUSPENDED) {
      return NextResponse.json({ error: SUSPENDED_MESSAGE }, { status: 503 });
    }

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
    if (REGISTRY_ISSUE_SUSPENDED) {
      return NextResponse.json({ error: SUSPENDED_MESSAGE }, { status: 503 });
    }

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
        ownerName: true,
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
