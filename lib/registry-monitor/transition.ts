import { prisma } from "@/lib/prisma";

// ── 계약~전입 기간 체크 ──
// ── 전입 예정일 지난 물건 자동 모드 전환 ──
export async function autoTransitionExpiredGaps() {
  const now = new Date();
  await prisma.monitoredProperty.updateMany({
    where: {
      monitorMode: "contract_gap",
      moveInDate: { lt: now },
      status: "active",
    },
    data: { monitorMode: "standard" },
  });
}

