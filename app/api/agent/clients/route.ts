/**
 * 중개관리 고객 목록/등록 API
 * GET:  고객 목록 (페이지네이션, 검색)
 * POST: 고객 등록
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { withAgentAuth } from "@/lib/with-agent-auth";

// ---------------------------------------------------------------------------
// GET — 고객 목록
// ---------------------------------------------------------------------------
export const GET = withAgentAuth(async (req, { session }) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "20")),
      100
    );
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || undefined;

    const where = {
      agentId: session.user.id,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { clientName: { contains: search, mode: "insensitive" as const } },
              { clientEmail: { contains: search, mode: "insensitive" as const } },
              { propertyAddress: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [clients, total] = await Promise.all([
      prisma.agentClient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { properties: true } } },
      }),
      prisma.agentClient.count({ where }),
    ]);

    return NextResponse.json({
      clients,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[agent/clients GET] ${message}`);
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
});

// ---------------------------------------------------------------------------
// POST — 고객 등록
// ---------------------------------------------------------------------------
export const POST = withAgentAuth(async (req, { session }) => {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const body = await req.json();
    const {
      clientName,
      clientPhone,
      clientEmail,
      memo,
      contractDate,
      propertyAddress,
    } = body;

    // --- 서버 검증 ---
    if (
      !clientName ||
      typeof clientName !== "string" ||
      clientName.trim().length < 2 ||
      clientName.trim().length > 30
    ) {
      return NextResponse.json(
        { error: "고객명은 2~30자로 입력해주세요." },
        { status: 400 }
      );
    }

    if (clientEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof clientEmail !== "string" || !emailRegex.test(clientEmail)) {
        return NextResponse.json(
          { error: "유효한 이메일 형식을 입력해주세요." },
          { status: 400 }
        );
      }
    }

    // --- 중복 체크 (동일 agentId + clientEmail) ---
    if (clientEmail) {
      const existing = await prisma.agentClient.findUnique({
        where: {
          agentId_clientEmail: {
            agentId: session.user.id,
            clientEmail: clientEmail.trim(),
          },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "이미 등록된 이메일의 고객입니다." },
          { status: 409 }
        );
      }
    }

    const client = await prisma.agentClient.create({
      data: {
        agentId: session.user.id,
        clientName: clientName.trim(),
        ...(clientPhone ? { clientPhone: clientPhone.trim() } : {}),
        ...(clientEmail ? { clientEmail: clientEmail.trim() } : {}),
        ...(memo ? { memo } : {}),
        ...(contractDate ? { contractDate: new Date(contractDate) } : {}),
        ...(propertyAddress ? { propertyAddress: propertyAddress.trim() } : {}),
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[agent/clients POST] ${message}`);
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
});
