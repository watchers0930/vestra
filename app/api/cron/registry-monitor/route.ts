/**
 * 등기변동 모니터링 Cron Job (v2 — CODEF 실연동)
 * ─────────────────────────────────────────────
 * Vercel Cron: 하루 2회 실행 (vercel.json: 0 3,8 * * *)
 *
 * 모니터링 모드:
 *  - standard: 일반 감시 (하루 2회)
 *  - contract_gap: 계약~전입 강화 감시 (contract_gap 대상 우선 처리)
 *
 * CODEF API를 통해 실제 등기부를 조회하고 SHA-256 해시 비교로 변동을 감지한다.
 * 데모 환경에서는 시뮬레이션, 유료 전환 시 실제 조회로 자동 전환.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { sendNotification } from "@/lib/notification-sender";
import { getNotificationRecipients } from "@/lib/monitoring-recipients";
import { verifyCronSecret } from "@/lib/cron-auth";
import { fetchRegistry, isCodefAvailable } from "@/lib/codef-api";
import { recordRegistrySnapshot } from "@/lib/registry-snapshot-recorder";
import { getSectionLabel } from "@/lib/registry-blockchain";
import {
  fetchRegistryCaseStatus,
  isTilkoAvailable,
  shouldConfirmWithCodef,
  fetchRegistryDocumentByAddress,
  isTilkoRegistryDocAvailable,
  extractCommUniqueNoFromText,
  type TilkoCaseStatusResult,
} from "@/lib/tilko-api";

const BATCH_SIZE = 50;

function generateContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function mapSignalStatus(phase: TilkoCaseStatusResult["phase"]): string {
  if (phase === "completed") return "pending_confirm";
  if (phase === "dismissed") return "dismissed";
  return "case_detected";
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

// ── 시뮬레이션용 등기부 생성 ──
const SIMULATED_CHANGE_TEXT: Record<string, string> = {
  mortgage_added: "을구 제3호 근저당권설정 채권최고액 금4억8,000만원 (시뮬레이션)",
  seizure_added: "을구 제4호 가압류 서울중앙지방법원 (시뮬레이션)",
  ownership_changed: "갑구 제5호 소유권이전 (시뮬레이션)",
  auction_started: "갑구 제6호 경매개시결정 (시뮬레이션)",
};

function generateSimulatedRegistry(
  baselineData: string | null,
  changeType: string
): string {
  const injectedText = SIMULATED_CHANGE_TEXT[changeType] || SIMULATED_CHANGE_TEXT.mortgage_added;

  if (baselineData) {
    return `${baselineData}\n${injectedText}`;
  }

  // 최소 더미 등기부
  return [
    "[표제부] 서울특별시 강남구 테헤란로 123 아파트 101동 1001호",
    "[갑구] 제1호 소유권보존 홍길동",
    "[을구] 제1호 근저당권설정 채권최고액 금2억원",
    injectedText,
  ].join("\n");
}

// ── CODEF로 등기부 조회 (유료 전환 대비) ──
async function fetchRegistryContent(
  address: string,
  commUniqueNo: string | null,
  options?: { simulate?: boolean; changeType?: string; baselineData?: string | null }
): Promise<{ text: string; raw?: Record<string, unknown> } | null> {
  // 시뮬레이션 모드: CODEF 호출 없이 가짜 등기부 반환
  if (options?.simulate) {
    const text = generateSimulatedRegistry(
      options.baselineData ?? null,
      options.changeType || "mortgage_added"
    );
    return { text };
  }

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

  // 폴백: CODEF 미사용 시 null 반환 → 변동 감지 skip
  return null;
}

// ── 계약~전입 기간 체크 ──
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

    // 시뮬레이션 모드 파라미터 파싱
    const url = new URL(req.url);
    const simulate = url.searchParams.get("simulate") === "true";
    const changeType = url.searchParams.get("changeType") || "mortgage_added";
    const propertyIdFilter = url.searchParams.get("propertyId");
    const forceCodef = url.searchParams.get("forceCodef") === "true";

    if (simulate) {
      console.log(`[CRON:MONITOR] 시뮬레이션 모드 — changeType=${changeType}, propertyId=${propertyIdFilter || "전체"}`);
    }

    // 전입일 지난 계약감시 → 일반 모드로 자동 전환
    await autoTransitionExpiredGaps();

    // 시뮬레이션에서 propertyId 지정 시 해당 물건만 조회
    const propertyFilter = {
      status: "active" as const,
      ...(propertyIdFilter ? { id: propertyIdFilter } : {}),
    };

    // contract_gap 모드 우선 처리
    const gapProperties = propertyIdFilter
      ? []
      : await prisma.monitoredProperty.findMany({
          where: { ...propertyFilter, monitorMode: "contract_gap" },
          take: Math.floor(BATCH_SIZE / 2),
          orderBy: { lastCheckedAt: "asc" },
          include: { user: { select: { id: true, email: true } } },
        });

    const standardProperties = await prisma.monitoredProperty.findMany({
      where: propertyIdFilter
        ? propertyFilter
        : { ...propertyFilter, monitorMode: "standard" },
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
    let tilkoPrechecks = 0;
    let tilkoSignals = 0;
    let skipped = 0;

    for (const prop of allProperties) {
      try {
        // commUniqueNo 없는 물건: Tilko 등기부 발급으로 직접 해시 비교
        // commUniqueNo가 있는 물건은 아래 사건 처리현황 경로로 진행
        if (!simulate && !prop.commUniqueNo && isTilkoRegistryDocAvailable()) {
          const now = new Date();
          try {
            const registry = await fetchRegistryDocumentByAddress({ address: prop.address });
            const newHash = generateContentHash(registry.text);
            const extractedNo = extractCommUniqueNoFromText(registry.text) ?? undefined;

            // 최초 조회: baseline 저장 후 다음 회차부터 비교
            if (!prop.lastHash) {
              await prisma.monitoredProperty.update({
                where: { id: prop.id },
                data: {
                  lastHash: newHash,
                  baselineData: registry.text,
                  lastCheckedAt: now,
                  registrySignalStatus: "confirmed_no_change",
                  ...(extractedNo ? { commUniqueNo: extractedNo } : {}),
                },
              });
              await recordRegistrySnapshot({ propertyId: prop.id, fullText: registry.text }).catch(() => {});
              tilkoPrechecks++;
              continue;
            }

            // 변동 없음
            if (prop.lastHash === newHash) {
              await prisma.monitoredProperty.update({
                where: { id: prop.id },
                data: {
                  lastCheckedAt: now,
                  registrySignalStatus: "confirmed_no_change",
                  ...(extractedNo && !prop.commUniqueNo ? { commUniqueNo: extractedNo } : {}),
                },
              });
              tilkoPrechecks++;
              continue;
            }

            // 변동 감지!
            let snapshotResult: { changedSections: string[]; isFirstSnapshot: boolean } | null = null;
            try {
              snapshotResult = await recordRegistrySnapshot({ propertyId: prop.id, fullText: registry.text });
            } catch { /* 스냅샷 실패해도 알림은 발송 */ }

            const oldContent = prop.baselineData || "";
            const changes = detectChanges(oldContent, registry.text);
            const sectionInfo = snapshotResult?.changedSections?.length
              ? `\n[변동 섹션: ${snapshotResult.changedSections.map(getSectionLabel).join(", ")}]`
              : "";

            for (const change of changes) {
              await prisma.monitoringAlert.create({
                data: {
                  monitoredPropertyId: prop.id,
                  changeType: change.changeType,
                  summary: change.summary,
                  detail: change.detail + sectionInfo,
                  riskLevel: change.riskLevel,
                },
              });
              alertsCreated++;

              const isGap = prop.monitorMode === "contract_gap";
              const isUrgent = change.riskLevel === "high" || change.riskLevel === "critical";
              if (isUrgent || isGap) {
                const prefix = isGap ? "[긴급:계약감시]" : "[VESTRA]";
                const suffix = isGap && isUrgent
                  ? "\n\n⚠️ 계약~전입 기간 중 등기 변동입니다. 즉시 확인하세요."
                  : "";
                const recipients = await getNotificationRecipients(prop.id, prop.userId);
                for (const recipientId of recipients) {
                  await sendNotification({
                    userId: recipientId,
                    type: "registry_change",
                    title: `${prefix} ${change.summary}`,
                    body: `${prop.address}\n${change.detail}${sectionInfo}${suffix}`,
                    data: {
                      propertyId: prop.id,
                      changeType: change.changeType,
                      riskLevel: change.riskLevel,
                      monitorMode: prop.monitorMode,
                      source: "tilko-doc",
                    },
                  });
                  notificationsSent++;
                }
              }
            }

            await prisma.monitoredProperty.update({
              where: { id: prop.id },
              data: {
                lastCheckedAt: now,
                lastHash: newHash,
                registrySignalStatus: "confirmed_changed",
                ...(extractedNo && !prop.commUniqueNo ? { commUniqueNo: extractedNo } : {}),
                ...(!prop.baselineData ? { baselineData: registry.text } : {}),
              },
            });
            tilkoPrechecks++;
          } catch (e) {
            console.error(`[CRON:MONITOR] Tilko 발급 직접 비교 실패: ${prop.address}`, e instanceof Error ? e.message : e);
            skipped++;
            await prisma.monitoredProperty.update({
              where: { id: prop.id },
              data: { lastCheckedAt: now },
            }).catch(() => {});
          }
          continue;
        }

        // 1차 감시: Tilko 등기신청사건 처리현황 조회
        // - 접수/처리 중: 조기 경고만 발송
        // - 처리 완료: 사용자 결제 기반 최신 등기부 발급 CTA까지만 진행
        // - Tilko 미설정/강제 조회/시뮬레이션: 기존 CODEF 경로 유지
        if (!simulate && !forceCodef && isTilkoAvailable()) {
          try {
            const caseStatus = await fetchRegistryCaseStatus({
              reqAddress: prop.address,
              commUniqueNo: prop.commUniqueNo,
              ownerName: prop.ownerName,
            });
            tilkoPrechecks++;

            const now = new Date();
            if (!caseStatus.hasSignal) {
              await prisma.monitoredProperty.update({
                where: { id: prop.id },
                data: {
                  tilkoLastCaseCheckedAt: now,
                  lastCheckedAt: now,
                  registrySignalStatus: "idle",
                },
              });
              continue;
            }

            tilkoSignals++;
            const signalStatus = mapSignalStatus(caseStatus.phase);
            const shouldCreateSignalAlert =
              prop.registrySignalStatus !== signalStatus ||
              prop.registrySignalSummary !== caseStatus.summary;

            await prisma.monitoredProperty.update({
              where: { id: prop.id },
              data: {
                tilkoLastCaseCheckedAt: now,
                lastCheckedAt: now,
                registrySignalStatus: signalStatus,
                registrySignalDetectedAt: prop.registrySignalDetectedAt || now,
                registrySignalSummary: caseStatus.summary,
                registrySignalRaw: caseStatus.rawData,
              },
            });

            if (shouldCreateSignalAlert) {
              await prisma.monitoringAlert.create({
                data: {
                  monitoredPropertyId: prop.id,
                  changeType: signalStatus === "dismissed" ? "case_dismissed" : "case_detected",
                  summary: caseStatus.summary,
                  detail:
                    signalStatus === "pending_confirm"
                      ? "등기신청 사건 처리가 완료된 것으로 감지되었습니다. 최신 등기부 확정조회로 실제 반영 내용을 확인합니다."
                      : "등기 변경으로 이어질 수 있는 신청 사건이 감지되었습니다. 아직 등기부등본 반영 여부는 확정 전입니다.",
                  riskLevel: signalStatus === "dismissed" ? "low" : "medium",
                },
              });
              alertsCreated++;

              const recipients = await getNotificationRecipients(prop.id, prop.userId);
              for (const recipientId of recipients) {
                await sendNotification({
                  userId: recipientId,
                  type: "registry_change",
                  title:
                    signalStatus === "pending_confirm"
                      ? "[VESTRA] 등기신청 처리완료 감지"
                      : "[VESTRA] 등기신청 사건 감지",
                  body: `${prop.address}\n${caseStatus.summary}\n아직 등기부등본 변경 확정 전입니다.`,
                  data: {
                    propertyId: prop.id,
                    changeType: signalStatus,
                    riskLevel: "medium",
                    monitorMode: prop.monitorMode,
                    source: "tilko",
                  },
                });
                notificationsSent++;
              }
            }

            if (shouldConfirmWithCodef(caseStatus)) {
              skipped++;
            }
            continue;
          } catch (tilkoError) {
            console.error(
              `[CRON:MONITOR] Tilko 프리체크 실패 (CODEF 직접 조회로 폴백): ${prop.address}`,
              tilkoError instanceof Error ? tilkoError.message : tilkoError
            );
          }
        }

        // CODEF로 등기부 조회 (시뮬레이션 시 가짜 등기부 반환)
        const registry = await fetchRegistryContent(prop.address, prop.commUniqueNo, simulate
          ? { simulate: true, changeType, baselineData: prop.baselineData }
          : undefined
        );

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
            data: {
              lastCheckedAt: new Date(),
              registrySignalStatus: "confirmed_no_change",
            },
          });
          continue;
        }

        // 변경 또는 최초 기준점인 경우에만 스냅샷 기록 (해시체인 + 머클트리 + 서명 + 암호화)
        let snapshotResult: { changedSections: string[]; isFirstSnapshot: boolean } | null = null;
        try {
          snapshotResult = await recordRegistrySnapshot({
            propertyId: prop.id,
            fullText: registry.text,
          });
        } catch (snapError) {
          console.error(
            `[CRON:MONITOR] 스냅샷 기록 실패 (기존 해시 비교로 폴백): ${prop.address}`,
            snapError instanceof Error ? snapError.message : snapError
          );
        }

        // 변동 감지! baseline과 비교
        const oldContent = prop.baselineData || "";
        const changes = prop.lastHash
          ? detectChanges(oldContent, registry.text)
          : [{ changeType: "baseline_set", summary: "기준 스냅샷 저장", detail: "최초 등기부 기준점이 설정되었습니다.", riskLevel: "low" as const }];

        // 시뮬레이션 모드: detail에 접두사 추가
        if (simulate) {
          for (const change of changes) {
            change.detail = `[시뮬레이션] ${change.detail}`;
          }
        }

        // 섹션 변동 정보 (있으면 알림에 추가)
        const sectionInfo = snapshotResult?.changedSections?.length
          ? `\n[변동 섹션: ${snapshotResult.changedSections.map(getSectionLabel).join(", ")}]`
          : "";

        // 알림 생성 + 발송
        for (const change of changes) {
          await prisma.monitoringAlert.create({
            data: {
              monitoredPropertyId: prop.id,
              changeType: change.changeType,
              summary: change.summary,
              detail: change.detail + sectionInfo,
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

            const recipients = await getNotificationRecipients(prop.id, prop.userId);
            for (const recipientId of recipients) {
              await sendNotification({
                userId: recipientId,
                type: "registry_change",
                title: `${prefix} ${change.summary}`,
                body: `${prop.address}\n${change.detail}${sectionInfo}${suffix}`,
                data: {
                  propertyId: prop.id,
                  changeType: change.changeType,
                  riskLevel: change.riskLevel,
                  monitorMode: prop.monitorMode,
                  ...(snapshotResult?.changedSections?.length
                    ? { changedSections: snapshotResult.changedSections.join(",") }
                    : {}),
                  ...(isGap && isUrgent ? { dgonAction: "emergency_lease_registration" } : {}),
                },
              });
              notificationsSent++;
            }
          }
        }

        // 해시 및 baseline 업데이트
        await prisma.monitoredProperty.update({
          where: { id: prop.id },
          data: {
            lastCheckedAt: new Date(),
            lastHash: newHash,
            registrySignalStatus: changes.some((change) => change.changeType !== "baseline_set")
              ? "confirmed_changed"
              : "confirmed_no_change",
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
      ...(simulate ? { simulation: true, changeType } : {}),
      processed: allProperties.length,
      gapMode: gapProperties.length,
      standardMode: standardProperties.length,
      codefQueries,
      tilkoPrechecks,
      tilkoSignals,
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
