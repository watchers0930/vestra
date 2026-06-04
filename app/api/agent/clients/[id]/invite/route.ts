/**
 * 중개관리 고객 초대 링크 생성 API
 * POST: 초대 토큰 생성 + status를 invited로 변경
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { withAgentAuth } from "@/lib/with-agent-auth";
import crypto from "crypto";

export const POST = withAgentAuth<{ id: string }>(
  async (req, { session, params }) => {
    try {
      const csrfError = validateOrigin(req);
      if (csrfError) return csrfError;

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

      const inviteToken = crypto.randomUUID();
      const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일 후

      await prisma.agentClient.update({
        where: { id: params.id },
        data: {
          inviteToken,
          inviteExpires,
          status: "invited",
        },
      });

      const baseUrl =
        process.env.NEXTAUTH_URL || "https://vestra-plum.vercel.app";
      const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

      return NextResponse.json({
        inviteToken,
        inviteUrl,
        expiresAt: inviteExpires.toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      console.error(`[agent/clients/[id]/invite POST] ${message}`);
      return NextResponse.json(
        { error: "처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
  }
);
