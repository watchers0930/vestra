import type { SubscriptionOrder } from "@prisma/client";
import { getPortoneV1Config } from "@/lib/danal/portone-v1-config";
import { fail } from "./errors";
import { memberReleaseConfig } from "./config";
import type { MemberPaymentInfo } from "@/types/member-subscription";
export interface MemberProviderConfig {
  impCode: string; mid: string; channelEnvironment: "test" | "live"; merchantConfigVersion: string;
}
export function memberProviderConfig(): MemberProviderConfig {
  memberReleaseConfig();
  // The immutable shared plumbing currently supports verified test channels only.
  // A member live channel needs the separately approved §9.3 plumbing contract.
  if (process.env.NODE_ENV === "production" || process.env.MEMBER_PAYMENT_ENVIRONMENT !== "test" ||
      process.env.MEMBER_SUBSCRIPTION_ISOLATED_TEST !== "true") fail("provider_unavailable");
  try {
    const config = getPortoneV1Config();
    const merchantConfigVersion = process.env.MEMBER_MERCHANT_CONFIG_VERSION?.trim();
    if (!merchantConfigVersion) return fail("provider_unavailable");
    return { impCode: config.impCode, mid: config.mid, channelEnvironment: "test", merchantConfigVersion };
  } catch { return fail("provider_unavailable"); }
}
export function paymentInfo(order: SubscriptionOrder, config: MemberProviderConfig,
  context: { callbackContext: string; callbackSignature: string }): MemberPaymentInfo {
  return { provider: "portone_v1", impCode: config.impCode, pg: `danal_tpay.${config.mid}`, payMethod: "card",
    paymentId: order.orderId, orderName: `VESTRA ${order.plan} ${order.durationMonths}개월`,
    amount: String(order.amount), currency: "KRW", expiresAt: order.expiresAt.toISOString(),
    redirectPath: "/renewal/pricing", callbackContext: context.callbackContext, callbackSignature: context.callbackSignature };
}
