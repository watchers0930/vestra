import { prisma } from "@/lib/prisma";
import { isMonitoringBlockedByOnboarding } from "@/lib/member-subscription/onboarding";

/**
 * 계약 완료 시 임차인에게 등기감시 자동 등록(갭2).
 * 즉시완료(양측 대행 서명)와 지연완료(임차인 독립 서명 제출) 양쪽에서 재사용.
 */
export async function autoRegisterMonitoring(params: {
  tenantId: string;
  address: string;
  contractType: string;
  depositVal: bigint | null;
  moveIn: Date | null;
  landlordName: string;
  listingId: string | null;
}): Promise<void> {
  const { tenantId, address, contractType, depositVal, moveIn, landlordName, listingId } = params;
  if (contractType !== "JEONSE" && contractType !== "MONTHLY") return;
  // [2A] 임차인이 미결제 REALESTATE/BUSINESS면 유료 기능인 자동 등기감시를 생성하지 않는다(계약 자체는 완료).
  // 개인(PERSONAL) 임차인은 requiresPaid가 아니므로 통과하고, release 미설정 시에도 통과한다(release-gated).
  if (await isMonitoringBlockedByOnboarding(tenantId)) return;

  const now = new Date();
  // 1만원 미만 절사로 0이 되는 것 방지(M4-소액): 최소 1만원 보장
  const depositManwon = depositVal !== null && depositVal > BigInt(0)
    ? Math.max(1, Number(depositVal / BigInt(10000)))
    : null;
  const mode = moveIn && moveIn.getTime() > now.getTime() ? "contract_gap" : "standard";
  const common = {
    listingId: listingId ?? null,
    monitorMode: mode,
    contractDate: now,
    moveInDate: moveIn,
    deposit: depositManwon,
    ownerName: landlordName,
  };
  await prisma.monitoredProperty
    .upsert({
      where: { userId_address: { userId: tenantId, address } },
      // 신규 생성 시에만 active. 기존 레코드는 status를 건드리지 않아 사용자가 paused한 감시 부활 방지(M6)
      create: { userId: tenantId, address, ...common, status: "active" },
      update: common,
    })
    .catch((e) => console.error("[autoRegisterMonitoring]", e));
}
