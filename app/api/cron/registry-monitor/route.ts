/**
 * 등기변동 모니터링 Cron Job (v2 — CODEF 실연동)
 * ─────────────────────────────────────────────
 * Vercel Cron: 매일 오전 9시 실행
 *
 * 모니터링 모드:
 *  - standard: 일반 감시 (1일 1회)
 *  - contract_gap: 계약~전입 강화 감시 (cron은 1일 1회지만 contract_gap 우선 처리)
 *
 * CODEF API를 통해 실제 등기부를 조회하고 SHA-256 해시 비교로 변동을 감지한다.
 * 데모 환경에서는 시뮬레이션, 유료 전환 시 실제 조회로 자동 전환.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { sendNotification } from "@/lib/notification-sender";
import { verifyCronSecret } from "@/lib/cron-auth";
import { fetchRegistry, isCodefAvailable } from "@/lib/codef-api";

const BATCH_SIZE = 50;

function generateContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

// ── 변동 유형 감지 (상세 분석) ──
interface ChangeDetection {
  changeType: string;
  summary: string;
  detail: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

function detectChanges(oldContent: string | null, newContent: string): ChangeDetection[] {
  const changes: ChangeDetection[] = [];
  const contentLower = newContent.toLowerCase();
  const oldLower = (oldContent || "").toLowerCase();

  // 근저당 신규 추가 감지
  const newMortgageCount = (contentLower.match(/근저당|저당권설정/g) || []).length;
  const oldMortgageCount = (oldLower.match(/근저당|저당권설정/g) || []).length;
  if (newMortgageCount > oldMortgageCount) {
    changes.push({
      changeType: "mortgage_added",
      summary: "근저당권 신규 설정 감지",
      detail: `등기부 을구에 근저당권이 새로 설정되었습니다. (기존 ${oldMortgageCount}건 → ${newMortgageCount}건)`,
      riskLevel: "high",
    });
  }

  // 압류/가압류 감지
  const newSeizure = (contentLower.match(/압류|가압류/g) || []).length;
  const oldSeizure = (oldLower.match(/압류|가압류/g) || []).length;
  if (newSeizure > oldSeizure) {
    changes.push({
      changeType: "seizure_added",
      summary: "압류/가압류 신규 감지",
      detail: "등기부에 압류 또는 가압류가 새로 등기되었습니다. 즉시 확인이 필요합니다.",
      riskLevel: "critical",
    });
  }

  // 소유권 이전 감지
  const newOwnership = (contentLower.match(/소유권이전/g) || []).length;
  const oldOwnership = (oldLower.match(/소유권이전/g) || []).length;
  if (newOwnership > oldOwnership) {
    changes.push({
      changeType: "ownership_changed",
      summary: "소유권 이전 감지",
      detail: "해당 부동산의 소유권이 이전되었습니다. 계약 상대방 확인이 필요합니다.",
      riskLevel: "high",
    });
  }

  // 경매 개시 감지
  if (contentLower.includes("경매개시") && !oldLower.includes("경매개시")) {
    changes.push({
      changeType: "auction_started",
      summary: "경매 개시결정 감지",
      detail: "해당 부동산에 경매 개시결정이 등기되었습니다. 긴급 대응이 필요합니다.",
      riskLevel: "critical",
    });
  }

  // 전세권 변동 감지
  const newLease = (contentLower.match(/전세권/g) || []).length;
  const oldLease = (oldLower.match(/전세권/g) || []).length;
  if (newLease !== oldLease) {
    changes.push({
      changeType: "lease_right_changed",
      summary: "전세권 변동 감지",
      detail: `전세권 설정 또는 말소 관련 변동이 감지되었습니다. (기존 ${oldLease}건 → ${newLease}건)`,
      riskLevel: "medium",
    });
  }

  // 변동은 있지만 특정 유형 미분류
  if (changes.length === 0) {
    changes.push({
      changeType: "general_change",
      summary: "등기부 변동 감지",
      detail: "등기부 내용에 변동이 감지되었습니다. 상세 내용을 확인해 주세요.",
      riskLevel: "medium",
    });
  }

  return changes;
}

// ── CODEF로 등기부 조회 (유료 전환 대비) ──
async function fetchRegistryContent(
  address: string,
  commUniqueNo: string | null
): Promise<{ text: string; raw?: Record<string, unknown> } | null> {
  // CODEF API 사용 가능하고 고유번호가 있는 경우
  if (isCodefAvailable() && commUniqueNo) {
    try {
      const result = await fetchRegistry({
        reqAddress: address,
        commUniqueNo,
      });
      return { text: result.text, raw: result.rawData };
    } catch (e) {
      console.error(`[CRON:MONITOR] CODEF 조회 실패: ${address}`, e instanceof Error ? e.message : e);
    }
  }

  // 폴백: CODEF 미사용 시 시뮬레이션 (유료 전환 전까지)
  // 실제 데이터가 없으므로 null 반환 → 변동 감지 skip
  return null;
}

// ── 계약~전입 기간 체크 ──
function isInContractGap(contractDate: Date | null, moveInDate: Date | null): boolean {
  if (!contractDate) return false;
  const now = new Date();
  const start = new Date(contractDate);
  const end = moveInDate ? new Date(moveInDate) : new Date(start.getTime() + 14 * 86400000); // 기본 14일
  return now >= start && now <= end;
}

// ── 전입 예정일 지난 물건 자동 모드 전환 ──
async function autoTransitionExpiredGaps() {
  const now = new Date();
  await prisma.monitoredProperty.updateMany({
    where: {
      monitorMode: "contract_gap",
      moveInDate: { lt: now },
      status: "active",
    },
    data: { monitorMode: "standard" },
  });
}

export async function GET(req: NextRequest) {
  try {
    if (!verifyCronSecret(req.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 전입일 지난 계약감시 → 일반 모드로 자동 전환
    await autoTransitionExpiredGaps();

    // contract_gap 모드 우선 처리
    const gapProperties = await prisma.monitoredProperty.findMany({
      where: { status: "active", monitorMode: "contract_gap" },
      take: Math.floor(BATCH_SIZE / 2),
      orderBy: { lastCheckedAt: "asc" },
      include: { user: { select: { id: true, email: true } } },
    });

    const standardProperties = await prisma.monitoredProperty.findMany({
      where: { status: "active", monitorMode: "standard" },
      take: BATCH_SIZE - gapProperties.length,
      orderBy: { lastCheckedAt: "asc" },
      include: { user: { select: { id: true, email: true } } },
    });

    const allProperties = [...gapProperties, ...standardProperties];

    if (allProperties.length === 0) {
      return NextResponse.json({ message: "모니터링 대상 없음", processed: 0 });
    }

    let alertsCreated = 0;
    let notificationsSent = 0;
    let codefQueries = 0;
    let skipped = 0;

    for (const prop of allProperties) {
      try {
        // CODEF로 등기부 조회
        const registry = await fetchRegistryContent(prop.address, prop.commUniqueNo);

        if (!registry) {
          skipped++;
          // 체크 시간은 갱신 (조회 시도 기록)
          await prisma.monitoredProperty.update({
            where: { id: prop.id },
            data: { lastCheckedAt: new Date() },
          });
          continue;
        }

        codefQueries++;
        const newHash = generateContentHash(registry.text);

        // 해시가 동일하면 변동 없음
        if (prop.lastHash === newHash) {
          await prisma.monitoredProperty.update({
            where: { id: prop.id },
            data: { lastCheckedAt: new Date() },
          });
          continue;
        }

        // 변동 감지! baseline과 비교
        const oldContent = prop.baselineData || "";
        const changes = prop.lastHash
          ? detectChanges(oldContent, registry.text)
          : [{ changeType: "baseline_set", summary: "기준 스냅샷 저장", detail: "최초 등기부 기준점이 설정되었습니다.", riskLevel: "low" as const }];

        // 알림 생성 + 발송
        for (const change of changes) {
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

          // contract_gap 모드에서 high/critical은 즉시 알림
          const isGap = prop.monitorMode === "contract_gap";
          const isUrgent = change.riskLevel === "high" || change.riskLevel === "critical";

          if (isUrgent || isGap) {
            const prefix = isGap ? "[긴급:계약감시]" : "[VESTRA]";
            const suffix = isGap && isUrgent
              ? "\n\n⚠️ 계약~전입 기간 중 등기 변동입니다. 즉시 확인하세요.\n💡 dgon에서 긴급 전세권 설정 등기를 진행할 수 있습니다."
              : "";

            await sendNotification({
              userId: prop.userId,
              type: "registry_change",
              title: `${prefix} ${change.summary}`,
              body: `${prop.address}\n${change.detail}${suffix}`,
              data: {
                propertyId: prop.id,
                changeType: change.changeType,
                riskLevel: change.riskLevel,
                monitorMode: prop.monitorMode,
                ...(isGap && isUrgent ? { dgonAction: "emergency_lease_registration" } : {}),
              },
            });
            notificationsSent++;
          }
        }

        // 해시 및 baseline 업데이트
        await prisma.monitoredProperty.update({
          where: { id: prop.id },
          data: {
            lastCheckedAt: new Date(),
            lastHash: newHash,
            // 최초 조회 시 baseline 저장
            ...(!prop.baselineData ? { baselineData: registry.text } : {}),
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
      processed: allProperties.length,
      gapMode: gapProperties.length,
      standardMode: standardProperties.length,
      codefQueries,
      skipped,
      alertsCreated,
      notificationsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON:MONITOR] 전체 오류:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "모니터링 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
