import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { MEMBER_SINGLE_MONITORING as product } from "@/lib/pricing-plans";
import { getDanalProvider } from "@/lib/danal";
import { SingleError } from "./errors";
import { lockedSingle } from "./transaction";

const ORDER_TTL = 15 * 60_000; // 결제 대기 주문 TTL 15분

export interface SingleOrderInput { address: string; idempotencyKey: string }

/** 무료회원 단건 주문 생성. 멱등 + 동시 1건 제한 + 미결제 주문 1건 가드. */
export async function createSingleOrder(userId: string, input: SingleOrderInput) {
  const provider = getDanalProvider(); // mock 아니면 provider_unavailable throw
  const address = input.address.trim();
  const result = await lockedSingle(userId, async tx => {
    const existing = await tx.memberSingleMonitoringOrder.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
    });
    if (existing) {
      if (existing.address !== address) throw new SingleError("invalid_input");
      return { order: existing, created: false };
    }
    const now = new Date();
    // 동시 1건 제한: 활성(미만료) 단건 물건이 이미 있으면 거부.
    const activeSingle = await tx.monitoredProperty.count({
      where: { userId, source: "single", status: "active", paidUntil: { gt: now } },
    });
    if (activeSingle >= 1) throw new SingleError("single_limit", 409);
    // 미결제/미적용 주문 1건만 유지(요청 키가 달라도).
    const pending = await tx.memberSingleMonitoringOrder.findFirst({
      where: { userId, OR: [
        { status: "pending", expiresAt: { gt: now } },
        { status: { in: ["paid", "needs_review"] }, appliedAt: null },
      ] },
      orderBy: { createdAt: "asc" },
    });
    if (pending) return { order: pending, created: false };
    await tx.memberSingleMonitoringOrder.updateMany({
      where: { userId, status: "pending", expiresAt: { lte: now } }, data: { status: "failed" },
    });
    const order = await tx.memberSingleMonitoringOrder.create({ data: {
      orderId: `msm_${randomUUID().replace(/-/g, "")}`, userId, address,
      amount: product.amount, currency: product.currency, productVersion: product.priceVersion,
      providerMode: provider.mode, idempotencyKey: input.idempotencyKey,
      expiresAt: new Date(now.getTime() + ORDER_TTL),
    } });
    return { order, created: true };
  });
  const { order } = result;
  if (order.providerMode !== provider.mode) throw new SingleError("provider_unavailable", 503);
  const payment = order.status === "pending" && order.expiresAt > new Date()
    ? await provider.payment.createPayment(order) : {};
  return {
    data: { orderId: order.orderId, amount: order.amount, currency: order.currency, payment, status: order.status },
    created: result.created,
  };
}

/** 주문 상태 폴링(IDOR: userId 소속만). */
export async function getSingleOrder(userId: string, orderId: string) {
  const order = await prisma.memberSingleMonitoringOrder.findFirst({
    where: { orderId, userId },
    select: { orderId: true, status: true, appliedAt: true, appliedPeriodEnd: true },
  });
  if (!order) throw new SingleError("not_found", 404);
  return {
    orderId: order.orderId, status: order.status, applied: !!order.appliedAt,
    paidUntil: order.appliedPeriodEnd?.toISOString() || null,
  };
}
