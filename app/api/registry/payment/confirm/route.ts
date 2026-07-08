import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getPGSettings } from "@/lib/system-settings";
import { createAuditLog } from "@/lib/audit-log";

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
    }

    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`registry-payment-confirm:${session.user.id}`, 10);
    if (!rl.success) {
      return NextResponse.json({ error: "요청 한도 초과" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const body = await req.json();
    const paymentKey = typeof body.paymentKey === "string" ? body.paymentKey.trim() : "";
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);

    if (!paymentKey || !orderId || !amount || amount <= 0) {
      return NextResponse.json({ error: "paymentKey, orderId, amount가 필요합니다." }, { status: 400 });
    }

    const order = await prisma.registryIssueOrder.findFirst({
      where: { orderId, userId: session.user.id },
      select: { id: true, orderId: true, amount: true, status: true },
    });

    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없거나 권한이 없습니다." }, { status: 404 });
    }
    if (order.status === "paid" || order.status === "issued") {
      return NextResponse.json({ success: true, orderId: order.orderId, alreadyPaid: true });
    }
    if (order.status !== "payment_required") {
      return NextResponse.json({ error: `처리할 수 없는 주문 상태입니다: ${order.status}` }, { status: 409 });
    }
    if (order.amount !== amount) {
      return NextResponse.json({ error: "결제 금액이 주문 금액과 일치하지 않습니다." }, { status: 400 });
    }

    const settings = await getPGSettings();
    const secretKey = settings["TOSS_SECRET_KEY"] || process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "결제 설정이 완료되지 않았습니다. 관리자에게 문의하세요." }, { status: 503 });
    }

    const basicToken = Buffer.from(`${secretKey}:`).toString("base64");
    const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const tossData = await tossRes.json();
    if (!tossRes.ok) {
      await createAuditLog({
        userId: session.user.id,
        action: "REGISTRY_PAYMENT_FAILED",
        target: order.id,
        detail: { orderId, tossError: tossData },
        req,
      });
      return NextResponse.json(
        { error: tossData.message || "결제 승인 실패", code: tossData.code },
        { status: 400 }
      );
    }

    await prisma.registryIssueOrder.update({
      where: { id: order.id },
      data: {
        status: "paid",
        rawData: {
          tossPayment: tossData,
        },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "REGISTRY_PAYMENT_CONFIRMED",
      target: order.id,
      detail: { orderId, paymentKey, amount, method: tossData.method },
      req,
    });

    return NextResponse.json({ success: true, orderId: order.orderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[registry/payment/confirm] ${message}`);
    return NextResponse.json({ error: "결제 확인 중 오류가 발생했습니다." }, { status: 500 });
  }
}
