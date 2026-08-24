import { prisma } from "@/lib/prisma";

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

  const now = new Date();
  const depositManwon = depositVal !== null ? Number(depositVal / BigInt(10000)) : null; // 원 → 만원
  const mode = moveIn && moveIn.getTime() > now.getTime() ? "contract_gap" : "standard";
  const data = {
    listingId: listingId ?? null,
    monitorMode: mode,
    contractDate: now,
    moveInDate: moveIn,
    deposit: depositManwon,
    ownerName: landlordName,
    status: "active",
  };
  await prisma.monitoredProperty
    .upsert({
      where: { userId_address: { userId: tenantId, address } },
      create: { userId: tenantId, address, ...data },
      update: data,
    })
    .catch((e) => console.error("[autoRegisterMonitoring]", e));
}
