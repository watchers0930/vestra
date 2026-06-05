/**
 * 중개관리 고객 물건 모니터링 등록 API
 * POST: 고객에 대한 물건 모니터링 등록
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

      // 고객 조회 + 소유권 검증
      const client = await prisma.agentClient.findUnique({
        where: { id: params.id },
      });

      if (!client) {
        return NextResponse.json(
          { error: "고객을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      if (client.agentId !== session.user.id) {
        return NextResponse.json(
          { error: "접근 권한이 없습니다." },
          { status: 403 }
        );
      }

      const body = await req.json();
      const { address, monitoredPropertyId } = body;

      // --- 서버 검증 ---
      if (!address || typeof address !== "string" || address.trim().length < 2) {
        return NextResponse.json(
          { error: "유효한 주소를 입력해주세요." },
          { status: 400 }
        );
      }

      // --- 중복 체크 (동일 agentClientId + address) ---
      const existing = await prisma.agentClientProperty.findUnique({
        where: {
          agentClientId_address: {
            agentClientId: params.id,
            address: address.trim(),
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "이미 등록된 물건 주소입니다." },
          { status: 409 }
        );
      }

      // monitoredPropertyId 미지정 시 주소로 자동 매칭
      let resolvedMonitorId = monitoredPropertyId || null;
      if (!resolvedMonitorId) {
        const matched = await prisma.monitoredProperty.findFirst({
          where: { address: address.trim(), status: "active" },
          select: { id: true },
        });
        if (matched) resolvedMonitorId = matched.id;
      }

      const property = await prisma.agentClientProperty.create({
        data: {
          agentClientId: params.id,
          address: address.trim(),
          ...(resolvedMonitorId ? { monitoredPropertyId: resolvedMonitorId } : {}),
        },
      });

      return NextResponse.json({ property }, { status: 201 });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      console.error(`[agent/clients/[id]/properties POST] ${message}`);
      return NextResponse.json(
        { error: "처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
  }
);
