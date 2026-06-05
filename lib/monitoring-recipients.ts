/**
 * 등기감시 알림 수신자 조회 헬퍼
 * ──────────────────────────────
 * MonitoredProperty에 연결된 AgentClientProperty → AgentClient 관계를 따라
 * 중개사(agent) + 고객(client) + 등록자(owner)에게 동시 알림을 보낸다.
 * 미가입 고객(clientUserId === null)은 스킵.
 */

import { prisma } from "@/lib/prisma";

export async function getNotificationRecipients(
  monitoredPropertyId: string,
  ownerId: string
): Promise<string[]> {
  const userIds = new Set<string>();
  userIds.add(ownerId);

  // AgentClientProperty → AgentClient 관계로 중개사 + 고객 조회
  const links = await prisma.agentClientProperty.findMany({
    where: {
      monitoredPropertyId,
      status: "active",
    },
    select: {
      agentClient: {
        select: {
          agentId: true,
          clientUserId: true,
        },
      },
    },
  });

  for (const link of links) {
    userIds.add(link.agentClient.agentId);
    if (link.agentClient.clientUserId) {
      userIds.add(link.agentClient.clientUserId);
    }
  }

  return Array.from(userIds);
}
