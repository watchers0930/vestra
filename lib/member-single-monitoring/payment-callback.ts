import { prisma } from "@/lib/prisma";
import { getDanalProvider } from "@/lib/danal";
import { applyRegistryBaseline } from "@/lib/registry-monitor/baseline";
import { SingleError } from "./errors";
import { recordSinglePayment } from "./record-payment";
import { applySinglePaidOrder } from "./activation";

/** 회원 단건 결제 콜백(mock 전용). 2차 재조회 + 교차대조 후 기록·활성화·baseline. */
export async function singlePaymentCallback(userId: string, input: unknown) {
  const provider = getDanalProvider(); // mock 아니면 provider_unavailable
  const callback = await provider.payment.verifyPayment(input);
  // 소유 확인(IDOR): 콜백 주문이 이 회원 소속인지.
  const owned = await prisma.memberSingleMonitoringOrder.findFirst({
    where: { orderId: callback.orderId, userId }, select: { orderId: true },
  });
  if (!owned) throw new SingleError("not_found", 404);
  // 의도적 2차 REST 재조회(설계 §3.3) — mock은 verificationReference(receipt)로 자체 완결 조회.
  // 반환 결제의 transactionId가 1차 콜백과 일치하는지 교차대조해 바꿔치기를 막는다.
  const secondReadRef = callback.verificationReference || callback.transactionId;
  const verified = await provider.payment.getPayment(secondReadRef);
  if (verified.orderId !== callback.orderId || verified.transactionId !== callback.transactionId) {
    throw new SingleError("payment_failed");
  }
  const paid = await recordSinglePayment(verified);
  if (paid) {
    const applied = await applySinglePaidOrder(paid.orderId);
    // baseline(Tilko 발급)은 트랜잭션 밖 best-effort — lock 장기점유 방지, 실패해도 등록은 유지.
    if (applied.propertyId && applied.baselineNeeded && applied.address) {
      await applyRegistryBaseline(applied.propertyId, applied.address);
    }
  }
  return { ok: true as const };
}
