/**
 * 중개관리 전체 고객 알림 목록 API
 * GET: 중개사의 모든 고객 물건에 연결된 MonitoringAlert 조회
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAgentAuth } from "@/lib/with-agent-auth";

export const GET = withAgentAuth(async (req, { session }) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "20")),
      100
    );

    const agentId = session.user.id;

    // 해당 중개사의 모든 AgentClientProperty에서 monitoredPropertyId 수집
    const clientProperties = await prisma.agentClientProperty.findMany({
      where: {
        agentClient: { agentId },
        monitoredPropertyId: { not: null },
      },
      select: { monitoredPropertyId: true },
    });

    const monitoredPropertyIds = clientProperties
      .map((cp) => cp.monitoredPropertyId)
      .filter((id): id is string => id !== null);

    if (monitoredPropertyIds.length === 0) {
      return NextResponse.json({
        alerts: [],
        total: 0,
        page,
        totalPages: 0,
      });
    }

    const where = {
      monitoredPropertyId: { in: monitoredPropertyIds },
    };

    const [alerts, total] = await Promise.all([
      prisma.monitoringAlert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          monitoredProperty: {
            select: { id: true, address: true },
          },
        },
      }),
      prisma.monitoringAlert.count({ where }),
    ]);

    return NextResponse.json({
      alerts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[agent/alerts GET] ${message}`);
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
});
