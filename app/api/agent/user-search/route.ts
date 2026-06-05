/**
 * 중개사용 회원 검색 API
 * GET ?q=검색어 — 개인회원(PERSONAL)을 이름/이메일로 검색
 * 검색 결과에 해당 회원의 활성 감시 물건 목록 포함
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAgentAuth } from "@/lib/with-agent-auth";

export const GET = withAgentAuth(async (req, { session }) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    if (q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // 이미 이 중개사의 고객으로 등록된 userId 목록 (중복 방지)
    const existingClients = await prisma.agentClient.findMany({
      where: { agentId: session.user.id, status: { not: "inactive" } },
      select: { clientUserId: true },
    });
    const linkedUserIds = existingClients
      .map((c) => c.clientUserId)
      .filter((id): id is string => id !== null);

    const users = await prisma.user.findMany({
      where: {
        role: "PERSONAL",
        id: { notIn: linkedUserIds },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        monitoredProperties: {
          where: { status: "active" },
          select: { id: true, address: true, monitorMode: true },
        },
      },
      take: 10,
    });

    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[agent/user-search GET] ${message}`);
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
});
