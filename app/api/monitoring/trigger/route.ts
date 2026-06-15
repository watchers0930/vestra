/**
 * 등기 감시 즉시 초기 스냅샷 트리거 API
 * POST: 주소 + 합성 텍스트로 MonitoredProperty 첫 스냅샷 생성
 *
 * 사용 시점: 등기부 AI 분석 완료 직후 호출
 * - MonitoredProperty.lastHash는 건드리지 않음 (Cron의 실제 CODEF 기반 변동 감지 보존)
 * - RegistrySnapshot 해시체인에만 기록 (감시 개시 시점 감사 기록)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { withAgentAuth } from "@/lib/with-agent-auth";
import { recordRegistrySnapshot } from "@/lib/registry-snapshot-recorder";

export const POST = withAgentAuth(async (req, { session }) => {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const body = await req.json();
    const { address, syntheticText } = body;

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "주소가 필요합니다." }, { status: 400 });
    }
    if (!syntheticText || typeof syntheticText !== "string") {
      return NextResponse.json({ error: "분석 텍스트가 필요합니다." }, { status: 400 });
    }

    // 이 중개인의 고객 물건 중 해당 주소의 MonitoredProperty 찾기
    const clientProp = await prisma.agentClientProperty.findFirst({
      where: {
        address: address.trim(),
        agentClient: { agentId: session.user.id },
        monitoredPropertyId: { not: null },
      },
      select: {
        monitoredPropertyId: true,
        monitoredProperty: {
          select: {
            id: true,
            status: true,
            _count: { select: { snapshots: true } },
          },
        },
      },
    });

    if (!clientProp?.monitoredPropertyId || !clientProp.monitoredProperty) {
      return NextResponse.json(
        { error: "감시 등록된 물건을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const monProp = clientProp.monitoredProperty;

    // 이미 스냅샷이 있으면 중복 생성 방지
    if (monProp._count.snapshots > 0) {
      return NextResponse.json({ alreadyInitialized: true, snapshotCount: monProp._count.snapshots });
    }

    // 초기 스냅샷 생성 (lastHash는 건드리지 않음)
    const result = await recordRegistrySnapshot({
      propertyId: monProp.id,
      fullText: syntheticText,
    });

    return NextResponse.json({
      success: true,
      snapshotHash: result.snapshotHash,
      sequenceNo: result.sequenceNo,
      isFirstSnapshot: result.isFirstSnapshot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[monitoring/trigger POST] ${message}`);
    return NextResponse.json(
      { error: "스냅샷 생성에 실패했습니다." },
      { status: 500 }
    );
  }
});
