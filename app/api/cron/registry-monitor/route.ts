/**
 * 등기변동 모니터링 Cron Job
 * ─────────────────────────
 * Vercel Cron: 매일 오전 9시 실행
 * 모니터링 등록된 부동산의 등기부를 주기적으로 확인하여
 * 변동 감지 시 알림을 발송한다.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { sendNotification } from "@/lib/notification-sender";

const BATCH_SIZE = 50; // Vercel 60초 타임아웃 고려

// 등기부 내용 해시 생성
function generateContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

// 변동 유형 감지
interface ChangeDetection {
  changeType: string;
  summary: string;
  detail: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

function detectChangeType(
  oldHash: string | null,
  newContent: string
): ChangeDetection {
  const contentLower = newContent.toLowerCase();

  // 키워드 기반 변동 유형 분류
  if (
    contentLower.includes("근저당") ||
    contentLower.includes("저당권설정")
  ) {
    return {
      changeType: "mortgage_added",
      summary: "근저당권 설정 변동 감지",
      detail: "등기부 을구에 근저당권 관련 변동이 감지되었습니다.",
      riskLevel: "high",
    };
  }

  if (contentLower.includes("압류") || contentLower.includes("가압류")) {
    return {
      changeType: "seizure_added",
      summary: "압류/가압류 변동 감지",
      detail:
        "등기부에 압류 또는 가압류 관련 변동이 감지되었습니다. 즉시 확인이 필요합니다.",
      riskLevel: "critical",
    };
  }

  if (contentLower.includes("소유권이전")) {
    return {
      changeType: "ownership_changed",
      summary: "소유권 이전 감지",
      detail: "해당 부동산의 소유권이 이전되었습니다.",
      riskLevel: "high",
    };
  }

  if (contentLower.includes("경매개시")) {
    return {
      changeType: "auction_started",
      summary: "경매 개시결정 감지",
      detail:
        "해당 부동산에 경매 개시결정이 등기되었습니다. 긴급 대응이 필요합니다.",
      riskLevel: "critical",
    };
  }

  if (contentLower.includes("전세권")) {
    return {
      changeType: "lease_right_changed",
      summary: "전세권 변동 감지",
      detail: "전세권 설정 또는 말소 관련 변동이 감지되었습니다.",
      riskLevel: "medium",
    };
  }

  // 기본 변동
  return {
    changeType: "general_change",
    summary: "등기부 변동 감지",
    detail: oldHash
      ? "등기부 내용에 변동이 감지되었습니다. 상세 내용을 확인해 주세요."
      : "최초 등기부 내용이 기록되었습니다.",
    riskLevel: oldHash ? "medium" : "low",
  };
}

export async function GET(req: NextRequest) {
  try {
    // Vercel Cron 인증
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // 개발 환경에서는 통과
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // 활성 모니터링 대상 조회 (배치)
    const properties = await prisma.monitoredProperty.findMany({
      where: { status: "active" },
      take: BATCH_SIZE,
      orderBy: { lastCheckedAt: "asc" }, // 가장 오래전 체크된 것 우선
      include: { user: { select: { id: true, email: true } } },
    });

    if (properties.length === 0) {
      return NextResponse.json({
        message: "모니터링 대상 없음",
        processed: 0,
      });
    }

    let alertsCreated = 0;
    let notificationsSent = 0;

    for (const prop of properties) {
      try {
        // 등기부 내용을 시뮬레이션 (실제로는 인터넷등기소 API 연동)
        // TODO: 대법원 인터넷등기소 API 또는 한국평가데이터 API 연동
        const registryContent = `registry-content-${prop.address}-${Date.now()}`;
        const newHash = generateContentHash(registryContent);

        // 해시 비교로 변동 감지
        if (prop.lastHash && prop.lastHash !== newHash) {
          const change = detectChangeType(prop.lastHash, registryContent);

          // 알림 레코드 생성
          await prisma.monitoringAlert.create({
            data: {
              monitoredPropertyId: prop.id,
              changeType: change.changeType,
              summary: change.summary,
              detail: change.detail,
              riskLevel: change.riskLevel,
            },
          });
          alertsCreated++;

          // 사용자 알림 발송
          await sendNotification({
            userId: prop.userId,
            type: "registry_change",
            title: `[VESTRA] ${change.summary}`,
            body: `${prop.address}\n${change.detail}`,
            data: {
              propertyId: prop.id,
              changeType: change.changeType,
              riskLevel: change.riskLevel,
            },
          });
          notificationsSent++;
        }

        // 체크 시간 및 해시 업데이트
        await prisma.monitoredProperty.update({
          where: { id: prop.id },
          data: {
            lastCheckedAt: new Date(),
            lastHash: newHash,
          },
        });
      } catch (propError) {
        console.error(
          `[CRON:MONITOR] 개별 처리 실패: ${prop.address}`,
          propError instanceof Error ? propError.message : propError
        );
      }
    }

    return NextResponse.json({
      message: "모니터링 완료",
      processed: properties.length,
      alertsCreated,
      notificationsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "[CRON:MONITOR] 전체 오류:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "모니터링 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
