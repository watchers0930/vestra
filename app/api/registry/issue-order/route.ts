import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit-log";

const ISSUE_PRICE = 1000;
const CONSENT_VERSION = "registry-issue-v1";

function makeOrderId() {
  return `reg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

    if (!address || address.length < 5) {
      return NextResponse.json({ error: "유효한 주소가 필요합니다." }, { status: 400 });
    }
    if (!commUniqueNo) {
      return NextResponse.json({ error: "조회 대상 부동산 확인 후 신청할 수 있습니다." }, { status: 400 });
    }
    if (!ownerName) {
      return NextResponse.json({ error: "등기부 조회/발급을 위해 소유자명이 필요합니다." }, { status: 400 });
    }
    if (!accepted) {
      return NextResponse.json({ error: "등기부 조회/발급 및 개인정보 제공 동의가 필요합니다." }, { status: 400 });
    }

    const order = await prisma.registryIssueOrder.create({
      data: {
        userId: session.user.id,
        address,
        commUniqueNo: commUniqueNo || null,
        ownerName: ownerName || null,
        amount: ISSUE_PRICE,
        status: "payment_required",
        provider: "codef",
        purpose,
        includeHistory,
        registerType: "0",
        consentVersion: CONSENT_VERSION,
        orderId: makeOrderId(),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "REGISTRY_ISSUE_ORDER_CREATED",
      target: order.id,
      detail: {
        orderId: order.orderId,
        address,
        commUniqueNo,
        amount: ISSUE_PRICE,
        provider: "codef",
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
      checkout: {
        status: "payment_required",
        amount: ISSUE_PRICE,
        message: "베스트라 서비스 이용료 결제 승인 후 등기부 조회 및 AI 권리분석이 실행됩니다.",
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[registry/issue-order] ${message}`);
    return NextResponse.json({ error: "등기부 조회 신청 중 오류가 발생했습니다." }, { status: 500 });
  }
}
