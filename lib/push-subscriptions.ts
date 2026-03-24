/**
 * Web Push 구독 관리 + 발송 유틸리티
 * ─────────────────────────────────────
 * DB(PushSubscription) 기반 구독 관리 + web-push로 실제 알림 발송
 */

import webpush from "web-push";
import { prisma } from "./prisma";

// VAPID 키 설정 (lazy init — 빌드 시점에는 실행하지 않음)
let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) {
    webpush.setVapidDetails("mailto:support@vestra-plum.vercel.app", pub, priv);
    vapidConfigured = true;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 구독 관리 (DB 기반)
// ---------------------------------------------------------------------------

/** Push 구독 저장 */
export async function addSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
  });
}

/** Push 구독 삭제 */
export async function removeSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

/** 특정 사용자의 모든 구독 조회 */
export async function getUserSubscriptions(userId: string) {
  return prisma.pushSubscription.findMany({ where: { userId } });
}

// ---------------------------------------------------------------------------
// Push 알림 발송
// ---------------------------------------------------------------------------

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** 특정 사용자에게 Push 알림 발송 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureVapidConfigured()) {
    console.warn("[PUSH] VAPID 키 미설정 — Push 발송 스킵");
    return { sent: 0, failed: 0 };
  }

  const subs = await getUserSubscriptions(userId);
  if (subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      // 410 Gone = 구독 만료 → DB에서 삭제
      if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }

  return { sent, failed };
}

/** 여러 사용자에게 Push 알림 일괄 발송 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  const results = await Promise.allSettled(
    userIds.map((id) => sendPushToUser(id, payload)),
  );

  let totalSent = 0;
  let totalFailed = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      totalSent += r.value.sent;
      totalFailed += r.value.failed;
    }
  }

  return { sent: totalSent, failed: totalFailed };
}
