/**
 * 중개관리 고객 목록/등록 API
 * GET:  고객 목록 (페이지네이션, 검색)
 * POST: 고객 등록
 */

import { NextResponse } from "next/server";
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
      ...(status ? { status } : { status: { not: "inactive" } }),
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

    const [raw, total] = await Promise.all([
      prisma.agentClient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { properties: true } },
          properties: {
            where: { status: "active" },
            select: { monitoredProperty: { select: { status: true } } },
          },
        },
      }),
      prisma.agentClient.count({ where }),
    ]);

    const clients = raw.map(({ properties, ...c }) => ({
      ...c,
      monitoringActive: properties.some((p) => p.monitoredProperty?.status === "active"),
    }));

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
      clientUserId,
      memo,
      contractDate,
      propertyAddress,
      monitoredPropertyIds,
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

    // --- 중복 체크 (동일 agentId + clientEmail, inactive 제외) ---
    if (clientEmail) {
      const existing = await prisma.agentClient.findFirst({
        where: {
          agentId: session.user.id,
          clientEmail: clientEmail.trim(),
          status: { not: "inactive" },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "이미 등록된 이메일의 고객입니다." },
          { status: 409 }
        );
      }
    }

    // clientUserId 중복 체크
    if (clientUserId) {
      const existingByUser = await prisma.agentClient.findFirst({
        where: {
          agentId: session.user.id,
          clientUserId,
          status: { not: "inactive" },
        },
      });
      if (existingByUser) {
        return NextResponse.json(
          { error: "이미 등록된 고객입니다." },
          { status: 409 }
        );
      }
    }

    // create 전 처리: 기존 inactive 레코드의 unique 필드 클리어 (재등록 충돌 방지)
    if (clientEmail) {
      await prisma.agentClient.updateMany({
        where: { agentId: session.user.id, clientEmail: clientEmail.trim(), status: "inactive" },
        data: { clientEmail: null },
      });
    }
    if (clientUserId) {
      await prisma.agentClient.updateMany({
        where: { clientUserId, status: "inactive" },
        data: { clientUserId: null },
      });
    }

    const client = await prisma.agentClient.create({
      data: {
        agentId: session.user.id,
        clientName: clientName.trim(),
        ...(clientPhone ? { clientPhone: clientPhone.trim() } : {}),
        ...(clientEmail ? { clientEmail: clientEmail.trim() } : {}),
        ...(clientUserId ? { clientUserId } : {}),
        ...(memo ? { memo } : {}),
        ...(contractDate ? { contractDate: new Date(contractDate) } : {}),
        ...(propertyAddress ? { propertyAddress: propertyAddress.trim() } : {}),
      },
    });

    // 감시 물건 자동 연결 (명시적 ID 지정)
    if (Array.isArray(monitoredPropertyIds) && monitoredPropertyIds.length > 0) {
      const monitoredProps = await prisma.monitoredProperty.findMany({
        where: { id: { in: monitoredPropertyIds }, status: "active" },
        select: { id: true, address: true },
      });

      for (const prop of monitoredProps) {
        await prisma.agentClientProperty.create({
          data: {
            agentClientId: client.id,
            address: prop.address,
            monitoredPropertyId: prop.id,
          },
        });
      }
    }

    // 케이스 1: clientUserId로 가입 고객인 경우 → 해당 고객의 등기감시 물건 자동 연결
    let case1Linked = false;
    if (clientUserId && !(Array.isArray(monitoredPropertyIds) && monitoredPropertyIds.length > 0)) {
      const clientMonitoredProps = await prisma.monitoredProperty.findMany({
        where: { userId: clientUserId, status: "active" },
        select: { id: true, address: true },
      });

      for (const prop of clientMonitoredProps) {
        await prisma.agentClientProperty.upsert({
          where: { agentClientId_address: { agentClientId: client.id, address: prop.address } },
          update: { monitoredPropertyId: prop.id },
          create: {
            agentClientId: client.id,
            address: prop.address,
            monitoredPropertyId: prop.id,
          },
        });
      }
      if (clientMonitoredProps.length > 0) case1Linked = true;
    }

    // 케이스 3: propertyAddress가 있고 아직 아무 물건도 연결 안 된 경우 → 자동 생성 (B타입/A타입 0건)
    const alreadyLinked =
      (Array.isArray(monitoredPropertyIds) && monitoredPropertyIds.length > 0) || case1Linked;

    if (propertyAddress && !alreadyLinked) {
      const addr = propertyAddress.trim();
      const ownerId = clientUserId ?? session.user.id;
      const newMonitor = await prisma.monitoredProperty.upsert({
        where: { userId_address: { userId: ownerId, address: addr } },
        update: { status: "active" },
        create: { userId: ownerId, address: addr },
      });
      await prisma.agentClientProperty.create({
        data: {
          agentClientId: client.id,
          address: addr,
          monitoredPropertyId: newMonitor.id,
        },
      });
    }

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
