import { prisma } from "@/lib/prisma";
import { paidPeriod } from "@/lib/guest-monitoring/period";
import { SingleError } from "./errors";
import { lockedSingle } from "./transaction";

export interface SingleActivationResult {
  applied: boolean;
  propertyId?: string;
  address?: string;
  baselineNeeded?: boolean;
}

/** 결제 완료 주문을 MonitoredProperty(source=single)로 활성화. TOCTOU 1건 재확인 + E5 동일주소 처리.
 * 영구 충돌은 자동환불 금지 — needs_review로 수동 큐에 남긴다. 반환 propertyId로 호출부가 baseline 처리. */
export async function applySinglePaidOrder(orderId: string): Promise<SingleActivationResult> {
  const ref = await prisma.memberSingleMonitoringOrder.findUniqueOrThrow({
    where: { orderId }, select: { userId: true },
  });
  const result = await lockedSingle<SingleActivationResult>(ref.userId, async tx => {
    const order = await tx.memberSingleMonitoringOrder.findUniqueOrThrow({ where: { orderId } });
    if (order.appliedAt) return { applied: true, propertyId: order.monitoredPropertyId ?? undefined, baselineNeeded: false };
    if (order.status === "needs_review") return { applied: false };
    if (order.status !== "paid" || !order.providerTransactionId) throw new SingleError("payment_failed");

    const userId = order.userId;
    const now = new Date();
    const review = async (reason: string): Promise<SingleActivationResult> => {
      await tx.memberSingleMonitoringOrder.update({ where: { id: order.id }, data: { status: "needs_review" } });
      await tx.auditLog.create({ data: { action: "MEMBER_SINGLE_NEEDS_REVIEW", target: order.orderId,
        detail: JSON.stringify({ reason }) } });
      return { applied: false };
    };

    // TOCTOU 1건 재확인: 다른 주소 단건이 이미 활성 → 동시 1건 초과(수동 검토).
    const otherActive = await tx.monitoredProperty.findFirst({
      where: { userId, source: "single", status: "active", paidUntil: { gt: now }, address: { not: order.address } },
      select: { id: true },
    });
    if (otherActive) return review("single_limit");

    const prop = await tx.monitoredProperty.findUnique({ where: { userId_address: { userId, address: order.address } } });
    let propertyId: string;
    let baselineNeeded: boolean;
    let period: { start: Date; end: Date };
    if (!prop) {
      period = paidPeriod(now, null);
      const created = await tx.monitoredProperty.create({ data: {
        userId, address: order.address, source: "single", status: "active", paidUntil: period.end, monitorMode: "standard",
      } });
      propertyId = created.id; baselineNeeded = true;
    } else if (prop.source === "subscription") {
      // E5: 동일 주소를 구독으로 이미 감시 중 → 단건 불필요/충돌, 결제 보관 후 수동 검토.
      return review("address_subscription_conflict");
    } else {
      // source=single: 동일 주소 재구매 = 연장(active면 잔여기간에 이어붙임, 만료/일시중지면 now부터).
      period = paidPeriod(now, prop.status === "active" ? prop.paidUntil : null);
      await tx.monitoredProperty.update({ where: { id: prop.id }, data: {
        status: "active", source: "single", paidUntil: period.end,
      } });
      propertyId = prop.id; baselineNeeded = !prop.commUniqueNo;
    }

    await tx.memberSingleMonitoringOrder.update({ where: { id: order.id }, data: {
      monitoredPropertyId: propertyId, appliedPeriodStart: period.start, appliedPeriodEnd: period.end, appliedAt: now,
    } });
    return { applied: true, propertyId, address: order.address, baselineNeeded };
  });
  if (!result.applied) {
    console.error("[MemberSingle] payment_needs_review", { orderId });
    throw new SingleError("payment_needs_review", 409);
  }
  return result;
}
