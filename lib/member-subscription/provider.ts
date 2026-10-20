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
  // 결제 테스트를 배포환경(t-vestra 등 NODE_ENV=production)에서도 할 수 있도록 과한 환경 제약을 완화.
  // 단 channelEnvironment는 "test"로 고정되고 validatePayment이 payment.sandbox===true를 강제하므로
  // 실제 과금(live)은 불가하다. 실결제(live) 전환은 별도 승인된 §9.3 live 채널 plumbing이 선행돼야 한다.
  // MEMBER_PAYMENT_ENVIRONMENT=test 명시 opt-in일 때만 결제창이 열린다.
  if (process.env.MEMBER_PAYMENT_ENVIRONMENT !== "test") fail("provider_unavailable");
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
