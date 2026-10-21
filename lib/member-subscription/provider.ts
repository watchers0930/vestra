import type { SubscriptionOrder } from "@prisma/client";
import { getPortoneV1Config } from "@/lib/danal/portone-v1-config";
import { getPortoneV2Config } from "@/lib/danal/portone-v2-config";
import { fail } from "./errors";
import { memberReleaseConfig } from "./config";
import type { MemberPaymentInfo } from "@/types/member-subscription";
// 하이브리드: 결제 요청은 V1 SDK(다날 카드, V2 미지원), 검증은 V2 API(결제가 V2 스토어에 저장됨).
// 따라서 config는 클라 요청용(impCode/mid)과 서버 검증용(storeId/mid 대조) 둘 다 담는다.
export interface MemberProviderConfig {
  impCode: string; mid: string; storeId: string; channelEnvironment: "test" | "live"; merchantConfigVersion: string;
}
export function memberProviderConfig(): MemberProviderConfig {
  memberReleaseConfig();
  // 결제 테스트를 배포환경(t-vestra 등 NODE_ENV=production)에서도 할 수 있도록 과한 환경 제약을 완화.
  // 단 channelEnvironment는 "test"로 고정되고 validatePayment이 channel.type==="TEST"를 강제하므로
  // 실제 과금(live)은 불가하다. 실결제(live) 전환은 별도 승인된 live 채널 plumbing이 선행돼야 한다.
  // MEMBER_PAYMENT_ENVIRONMENT=test 명시 opt-in일 때만 결제창이 열린다.
  if (process.env.MEMBER_PAYMENT_ENVIRONMENT !== "test") fail("provider_unavailable");
  try {
    const v1 = getPortoneV1Config();            // 클라 요청용: impCode, mid(danal)
    const v2 = getPortoneV2Config();            // 서버 검증용: storeId(+ apiSecret은 rest 내부 사용)
    const merchantConfigVersion = process.env.MEMBER_MERCHANT_CONFIG_VERSION?.trim();
    if (!merchantConfigVersion) return fail("provider_unavailable");
    return { impCode: v1.impCode, mid: v1.mid, storeId: v2.storeId, channelEnvironment: "test", merchantConfigVersion };
  } catch { return fail("provider_unavailable"); }
}
export function paymentInfo(order: SubscriptionOrder, config: MemberProviderConfig,
  context: { callbackContext: string; callbackSignature: string }): MemberPaymentInfo {
  // 결제 요청은 V1 SDK: IMP.init(impCode) → request_pay({ pg: danal_tpay.MID, pay_method: card }).
  return { provider: "portone_v1", impCode: config.impCode, pg: `danal_tpay.${config.mid}`, payMethod: "card",
    paymentId: order.orderId, orderName: `VESTRA ${order.plan} ${order.durationMonths}개월`,
    amount: String(order.amount), currency: "KRW", expiresAt: order.expiresAt.toISOString(),
    redirectPath: "/renewal/pricing", callbackContext: context.callbackContext, callbackSignature: context.callbackSignature };
}
