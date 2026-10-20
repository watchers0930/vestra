import { randomUUID } from "node:crypto";
import type { SubscriptionOrder } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findImpUidByMerchantUid } from "@/lib/danal/iamport-rest";
import type { MemberOrderRequest, MemberOrderResponse, MemberOrderStatus } from "@/types/member-subscription";
import { fail, providerBoundary } from "./errors";
import { memberReleaseConfig } from "./config";
import { priceProduct } from "./pricing";
import { assertPlanAllowed, ensurePolicy, resolveEffectiveRole } from "./policy";
import { memberTransaction } from "./transaction";
import { memberProviderConfig, paymentInfo } from "./provider";
import { issueCallbackContext } from "./callback-context";
const ORDER_TTL_MS = 15 * 60_000;
function sameProduct(order: SubscriptionOrder, input: MemberOrderRequest) {
  return order.plan === input.plan && order.durationMonths === input.durationMonths && order.productKind === input.productKind &&
    order.purpose === input.purpose;
}
/**
 * Release an abandoned, expired `pending` order that never reached payment — otherwise a
 * TTL-expired pending order is reused forever and gives no payment info, permanently
 * blocking repurchase. Only an order with NO settlement evidence (no consumed nonce, no
 * provider tx) is eligible, and only after the PG confirms NO charge exists for it (a
 * lost-callback charge must be recovered, never discarded). Runs outside the create tx
 * because it makes a provider call; on any PG uncertainty it leaves the order intact.
 */
async function supersedeAbandonedPending(userId: string) {
  const abandoned = await prisma.subscriptionOrder.findFirst({ where: {
    userId, status: "pending", nonceConsumedAt: null, providerTransactionId: null, expiresAt: { lte: new Date() },
  }, orderBy: { createdAt: "asc" } });
  if (!abandoned) return;
  let impUid: string | null;
  try { impUid = await providerBoundary(() => findImpUidByMerchantUid(abandoned.orderId)); }
  catch { return; } // ambiguous/unavailable → keep for recovery, never discard a possible charge
  if (impUid) return; // a real charge exists → must be recovered, not superseded
  await prisma.subscriptionOrder.updateMany({ where: {
    id: abandoned.id, status: "pending", nonceConsumedAt: null, providerTransactionId: null,
  }, data: { status: "expired" } });
}
export async function createMemberOrder(userId: string, input: MemberOrderRequest): Promise<MemberOrderResponse> {
  const release = memberReleaseConfig();
  await supersedeAbandonedPending(userId);
  const result = await memberTransaction(userId, async tx => {
    const { user, role } = await resolveEffectiveRole(userId, tx);
    assertPlanAllowed(role, input.plan, user.verifyStatus);
    if ((input.productKind === "paid_trial" || input.durationMonths === 1) && role !== "PERSONAL") fail("plan_not_allowed");
    const price = priceProduct(input.plan, input.durationMonths, input.productKind);
    const prior = await tx.subscriptionOrder.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } } });
    if (prior) {
      if (!sameProduct(prior, input)) fail("idempotency_conflict");
      return prior;
    }
    await ensurePolicy(user, tx);
    const sub = user.subscription;
    if (sub?.status === "active" && (!sub.endDate || sub.endDate > new Date()) && sub.plan !== "FREE" &&
        (sub.plan === "BUSINESS" ? "PREMIUM" : sub.plan) !== input.plan) fail("plan_change_not_allowed");
    if (input.productKind === "paid_trial" && await tx.subscriptionOrder.findFirst({ where: {
      userId, productKind: "paid_trial", status: { in: ["paid", "refunded", "needs_review"] },
    }, select: { id: true } })) fail("trial_already_used");
    // Ambiguous pending orders must be recovered before another payment can start,
    // including after TTL: expiration is not evidence that a charge did not occur.
    const outstanding = await tx.subscriptionOrder.findFirst({ where: {
      userId, OR: [{ status: { in: ["pending", "needs_review"] } }, { status: "paid", appliedAt: null }],
    }, orderBy: { createdAt: "asc" } });
    if (outstanding) {
      if (!sameProduct(outstanding, input)) fail("idempotency_conflict");
      return outstanding;
    }
    const config = memberProviderConfig();
    const orderId = `msub_${randomUUID()}`;
    const expiresAt = new Date(Date.now() + ORDER_TTL_MS);
    const { callbackNonceHash } = issueCallbackContext({ orderId, userId, expiresAt });
    return tx.subscriptionOrder.create({ data: {
      ...input, ...price, userId, orderId, expiresAt, callbackNonceHash,
      priceVersion: release.priceVersion, policyVersion: release.policyVersion, roleAtOrder: role,
      channelEnvironment: config.channelEnvironment, merchantConfigVersion: config.merchantConfigVersion,
    } });
  });
  let payment: MemberOrderResponse["payment"] = {};
  if (result.status === "pending" && result.expiresAt > new Date()) {
    const config = memberProviderConfig();
    if (result.channelEnvironment !== config.channelEnvironment || result.merchantConfigVersion !== config.merchantConfigVersion) fail("provider_unavailable");
    payment = paymentInfo(result, config, issueCallbackContext(result));
  }
  return { orderId: result.orderId, amount: result.amount, currency: "KRW", plan: result.plan as MemberOrderResponse["plan"],
    durationMonths: result.durationMonths as MemberOrderResponse["durationMonths"], status: result.status as MemberOrderResponse["status"], payment };
}
export async function ownedOrder(userId: string, orderId: string) {
  const order = await prisma.subscriptionOrder.findFirst({ where: { userId, orderId, providerMode: "portone_v1" } });
  if (!order) return fail("not_found");
  return order;
}
export function orderStatus(order: SubscriptionOrder): MemberOrderStatus {
  return { orderId: order.orderId, status: order.status as MemberOrderStatus["status"], applied: !!order.appliedAt,
    appliedPeriodStart: order.appliedPeriodStart?.toISOString() ?? null, appliedPeriodEnd: order.appliedPeriodEnd?.toISOString() ?? null,
    plan: order.plan as MemberOrderStatus["plan"], durationMonths: order.durationMonths as MemberOrderStatus["durationMonths"] };
}
