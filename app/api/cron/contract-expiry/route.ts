import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notification-sender";
import { verifyCronSecret } from "@/lib/cron-auth";

/**
 * 계약 만료 임박 감지 Cron (갭3) — Vercel Cron: 매일 09:00 (vercel.json)
 * 완료된 전세/월세 계약 중 만료 D-30 이내(또는 경과)인 건을 찾아,
 * 임차인(가입회원)에게 보증금 반환 준비 안내 + 내용증명 바로가기를 1회 발송한다.
 */
const REMIND_DAYS = 30;   // 만료 D-30부터 안내
const GRACE_DAYS = 7;     // 만료 D+7까지만 (그 이전 과거 계약 대량 발송 방지, H4)
const DAY = 86400000;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + REMIND_DAYS * DAY);
  const floor = new Date(now.getTime() - GRACE_DAYS * DAY); // 하한: 만료 D+7 이전 과거계약 제외(H4)

  const targets = await prisma.eContract.findMany({
    where: {
      status: "COMPLETED",
      contractType: { in: ["JEONSE", "MONTHLY"] },
      tenantId: { not: null },
      endDate: { gte: floor, lte: horizon },
      endReminderSentAt: null,
    },
    select: { id: true, tenantId: true, address: true, endDate: true },
    take: 200,
  });

  let sent = 0;
  for (const c of targets) {
    if (!c.tenantId || !c.endDate) continue;
    // 중복발송 방지(M6): endReminderSentAt=null일 때만 선점 갱신 → 동시실행/재시도 시 승자만 발송
    const claim = await prisma.eContract.updateMany({
      where: { id: c.id, endReminderSentAt: null },
      data: { endReminderSentAt: now },
    });
    if (claim.count === 0) continue; // 다른 실행이 이미 처리
    const dday = Math.ceil((c.endDate.getTime() - now.getTime()) / DAY);
    const ddayText = dday >= 0 ? `D-${dday}` : `만료 ${-dday}일 경과`;
    try {
      await sendNotification({
        userId: c.tenantId,
        type: "system",
        title: `임대차 계약 만료 ${ddayText}`,
        body: `${c.address} 계약이 ${c.endDate.toISOString().slice(0, 10)}에 만료됩니다. 보증금 반환 준비가 필요하면 내용증명을 미리 작성하세요.`,
        data: { econtractId: c.id, url: "/renewal/keepzip", kind: "contract_expiry" },
      });
      sent++;
    } catch (e) {
      console.error("[cron/contract-expiry]", c.id, e);
    }
  }

  return NextResponse.json({ ok: true, scanned: targets.length, sent });
}
