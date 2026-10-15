/**
 * 등기변동 모니터링 — 알림 생성 & 발송
 * ─────────────────────────────────────────────
 * MonitoringAlert 1건을 생성하고, 발송 조건이면 수신자 전체에게 푸시한다.
 * registry-monitor cron의 프리체크/확정조회 경로 공통 로직을 추출(동작 변경 없음).
 */

import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notification-sender";
import { getNotificationRecipients } from "@/lib/monitoring-recipients";

export interface AlertDispatchResult {
  alertsCreated: number;
  notificationsSent: number;
}

export async function createAlertAndNotify(params: {
  propertyId: string;
  userId: string;
  changeType: string;
  summary: string;
  alertDetail: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  // 발송 여부. false면 DB 알림만 남기고 푸시는 생략한다(노이즈 억제).
  notify: boolean;
  notification?: {
    title: string;
    body: string;
    data: Record<string, string>;
  };
}): Promise<AlertDispatchResult> {
  await prisma.monitoringAlert.create({
    data: {
      monitoredPropertyId: params.propertyId,
      changeType: params.changeType,
      summary: params.summary,
      detail: params.alertDetail,
      riskLevel: params.riskLevel,
    },
  });

  let notificationsSent = 0;
  if (params.notify && params.notification) {
    const recipients = await getNotificationRecipients(params.propertyId, params.userId);
    for (const recipientId of recipients) {
      await sendNotification({
        userId: recipientId,
        type: "registry_change",
        title: params.notification.title,
        body: params.notification.body,
        data: params.notification.data,
      });
      notificationsSent++;
    }
  }

  return { alertsCreated: 1, notificationsSent };
}
