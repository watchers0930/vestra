/**
 * 중개관리 대시보드 통계 API
 * GET: 전체 고객 수, 활성 물건 수, 최근 알림 수, 초대 중 고객 수
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAgentAuth } from "@/lib/with-agent-auth";

export const GET = withAgentAuth(async (_req, { session }) => {
  try {
    const agentId = session.user.id;

    const [totalClients, invitedClients, activeProperties, recentAlerts] =
      await Promise.all([
        // 전체 고객 수 (active)
        prisma.agentClient.count({
          where: { agentId, status: "active" },
        }),

        // 초대 중인 고객 수
        prisma.agentClient.count({
          where: { agentId, status: "invited" },
        }),

        // 활성 물건 수
        prisma.agentClientProperty.count({
          where: {
            agentClient: { agentId },
            status: "active",
          },
        }),

        // 최근 7일 알림 수 (고객 물건의 MonitoringAlert)
        prisma.monitoringAlert.count({
          where: {
            monitoredProperty: {
              agentClientProperties: {
                some: {
                  agentClient: { agentId },
                },
              },
            },
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    return NextResponse.json({
      totalClients,
      activeProperties,
      recentAlerts,
      invitedClients,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[agent/stats GET] ${message}`);
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
});
