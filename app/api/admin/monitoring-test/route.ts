/**
 * 등기감시 시뮬레이션 테스트 API
 * ─────────────────────────────
 * CODEF 키 만료 등 실제 변동 감지가 불가한 상황에서
 * 관리자가 수동으로 알림을 트리거하여 전체 파이프라인을 검증한다.
 *
 * POST { mode: "trigger_alert", monitoredPropertyId, changeType?, riskLevel?, summary?, detail? }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { sendNotification } from "@/lib/notification-sender";
import { getNotificationRecipients } from "@/lib/monitoring-recipients";
import { withAdminAuth } from "@/lib/with-admin-auth";

export const POST = withAdminAuth(async (req) => {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const body = await req.json();
  const { mode, monitoredPropertyId, changeType, riskLevel, summary, detail } = body;

  if (mode !== "trigger_alert" || !monitoredPropertyId) {
    return NextResponse.json(
      { error: "mode='trigger_alert'와 monitoredPropertyId가 필요합니다." },
      { status: 400 }
    );
  }

  // MonitoredProperty 조회
  const prop = await prisma.monitoredProperty.findUnique({
    where: { id: monitoredPropertyId },
    select: { id: true, userId: true, address: true, monitorMode: true },
  });

  if (!prop) {
    return NextResponse.json(
      { error: "해당 모니터링 물건을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const alertChangeType = changeType || "simulation_test";
  const alertRiskLevel = riskLevel || "medium";
  const alertSummary = summary || "[테스트] 등기변동 시뮬레이션";
  const alertDetail = detail || "관리자가 수동으로 트리거한 시뮬레이션 알림입니다.";

  // MonitoringAlert DB 생성
  const alert = await prisma.monitoringAlert.create({
    data: {
      monitoredPropertyId: prop.id,
      changeType: alertChangeType,
      summary: alertSummary,
      detail: alertDetail,
      riskLevel: alertRiskLevel,
    },
  });

  // 수신자 조회 (등록자 + 중개사 + 고객)
  const recipients = await getNotificationRecipients(prop.id, prop.userId);

  // 각 수신자에게 알림 발송
  const sendResults: { userId: string; results: { channel: string; success: boolean; error?: string }[] }[] = [];
  for (const recipientId of recipients) {
    const results = await sendNotification({
      userId: recipientId,
      type: "registry_change",
      title: `[시뮬레이션] ${alertSummary}`,
      body: `${prop.address}\n${alertDetail}`,
      data: {
        propertyId: prop.id,
        changeType: alertChangeType,
        riskLevel: alertRiskLevel,
        monitorMode: prop.monitorMode,
        simulation: "true",
      },
    });
    sendResults.push({ userId: recipientId, results });
  }

  return NextResponse.json({
    success: true,
    alertId: alert.id,
    property: { id: prop.id, address: prop.address },
    recipients,
    recipientCount: recipients.length,
    sendResults,
  });
});
