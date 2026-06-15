/**
 * 중개관리 고객 등기감시 토글 API
 * POST: 해당 고객의 연결된 MonitoredProperty를 active ↔ paused 전환
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { withAgentAuth } from "@/lib/with-agent-auth";

export const POST = withAgentAuth<{ id: string }>(
  async (req, { session, params }) => {
    try {
      const csrfError = validateOrigin(req);
      if (csrfError) return csrfError;

      // 고객 소유권 검증
      const client = await prisma.agentClient.findUnique({
        where: { id: params.id },
        select: { agentId: true },
      });

      if (!client) {
        return NextResponse.json({ error: "고객을 찾을 수 없습니다." }, { status: 404 });
      }
      if (client.agentId !== session.user.id) {
        return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
      }

      // 연결된 MonitoredProperty 목록 조회
      const properties = await prisma.agentClientProperty.findMany({
        where: { agentClientId: params.id, status: "active" },
        select: { monitoredPropertyId: true, monitoredProperty: { select: { status: true } } },
      });

      const monitoredIds = properties
        .map((p) => p.monitoredPropertyId)
        .filter((id): id is string => !!id);

      if (monitoredIds.length === 0) {
        return NextResponse.json({ error: "연결된 등기감시 물건이 없습니다." }, { status: 400 });
      }

      // 현재 상태 파악 → 하나라도 active면 "감시 중"으로 판단 → paused로 전환
      const isCurrentlyActive = properties.some((p) => p.monitoredProperty?.status === "active");
      const nextStatus = isCurrentlyActive ? "paused" : "active";

      await prisma.monitoredProperty.updateMany({
        where: { id: { in: monitoredIds } },
        data: { status: nextStatus },
      });

      return NextResponse.json({ monitoringActive: nextStatus === "active" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "알 수 없는 오류";
      console.error(`[agent/clients/[id]/toggle-monitoring POST] ${message}`);
      return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
    }
  }
);
