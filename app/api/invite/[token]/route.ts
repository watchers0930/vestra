/**
 * 중개관리 고객 초대 링크 — 수신측 API
 * GET  : 토큰으로 초대 정보 조회 (공개, 유효성 판단)
 * POST : 로그인한 고객이 초대를 수락 → 중개사와 계정 연결
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";

// GET /api/invite/[token] — 초대 정보 조회 (공개)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const client = await prisma.agentClient.findUnique({
      where: { inviteToken: token },
      select: {
        clientName: true,
        clientUserId: true,
        inviteExpires: true,
        agent: { select: { name: true, companyName: true } },
      },
    });

    if (!client) {
      return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
    }

    const expired = !!client.inviteExpires && client.inviteExpires.getTime() < Date.now();
    const accepted = !!client.clientUserId;

    return NextResponse.json({
      valid: !expired && !accepted,
      expired,
      accepted,
      clientName: client.clientName,
      agentName: client.agent?.companyName || client.agent?.name || "중개사",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[invite/[token] GET] ${message}`);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/invite/[token] — 초대 수락 (로그인 필수)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { token } = await params;
    const client = await prisma.agentClient.findUnique({
      where: { inviteToken: token },
    });

    if (!client) {
      return NextResponse.json({ error: "유효하지 않은 초대입니다." }, { status: 404 });
    }

    if (client.inviteExpires && client.inviteExpires.getTime() < Date.now()) {
      return NextResponse.json({ error: "만료된 초대 링크입니다." }, { status: 410 });
    }

    // 이미 다른 계정이 수락한 초대
    if (client.clientUserId && client.clientUserId !== session.user.id) {
      return NextResponse.json({ error: "이미 다른 계정에 연결된 초대입니다." }, { status: 409 });
    }

    // clientUserId @unique — 이 계정이 다른 중개사에 이미 연결돼 있으면 거부
    const existing = await prisma.agentClient.findUnique({
      where: { clientUserId: session.user.id },
      select: { id: true },
    });
    if (existing && existing.id !== client.id) {
      return NextResponse.json(
        { error: "이미 다른 중개사에 연결된 계정입니다." },
        { status: 409 }
      );
    }

    await prisma.agentClient.update({
      where: { id: client.id },
      data: {
        clientUserId: session.user.id,
        status: "active",
        inviteToken: null, // 토큰 소진 (재사용 방지)
        inviteExpires: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[invite/[token] POST] ${message}`);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
