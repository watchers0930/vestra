/**
 * 중개관리 고객 물건 모니터링 해제 API
 * DELETE: 물건 모니터링 실제 삭제
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { withAgentAuth } from "@/lib/with-agent-auth";

export const DELETE = withAgentAuth<{ id: string; propId: string }>(
  async (req, { session, params }) => {
    try {
      const csrfError = validateOrigin(req);
      if (csrfError) return csrfError;

      // 물건 조회 + 고객 include (소유권 검증용)
      const property = await prisma.agentClientProperty.findUnique({
        where: { id: params.propId },
        include: { agentClient: true },
      });

      if (!property) {
        return NextResponse.json(
          { error: "물건을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      // 소유권 검증: AgentClientProperty → AgentClient → agentId
      if (property.agentClient.agentId !== session.user.id) {
        return NextResponse.json(
          { error: "접근 권한이 없습니다." },
          { status: 403 }
        );
      }

      // 고객 ID 일치 검증
      if (property.agentClientId !== params.id) {
        return NextResponse.json(
          { error: "해당 고객의 물건이 아닙니다." },
          { status: 400 }
        );
      }

      await prisma.agentClientProperty.delete({
        where: { id: params.propId },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      console.error(
        `[agent/clients/[id]/properties/[propId] DELETE] ${message}`
      );
      return NextResponse.json(
        { error: "처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
  }
);
