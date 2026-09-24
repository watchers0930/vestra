/**
 * 등기변동 모니터링 Cron Job (v3 — Tilko 단일 소스)
 * ─────────────────────────────────────────────
 * Vercel Cron: 하루 2회 실행 (vercel.json: 0 3,8 * * *)
 *
 * 모니터링 모드:
 *  - standard: 일반 감시 (하루 2회)
 *  - contract_gap: 계약~전입 강화 감시 (contract_gap 대상 우선 처리)
 *
 * Tilko API로 등기신청사건 처리현황(프리체크) + 등기부등본 발급을 수행하고
 * SHA-256 해시 비교로 변동을 감지한다. 데모/테스트 시 시뮬레이션 모드 사용.
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { sendNotification } from "@/lib/notification-sender";
import { getNotificationRecipients } from "@/lib/monitoring-recipients";
import { verifyCronSecret } from "@/lib/cron-auth";
import { recordRegistrySnapshot } from "@/lib/registry-snapshot-recorder";
import { getSectionLabel } from "@/lib/registry-blockchain";
import {
  fetchRegistryCaseStatus,
  isTilkoAvailable,
  shouldConfirmWithFullDoc,
  fetchRegistryDocumentByAddress,
  isTilkoRegistryDocAvailable,
  extractCommUniqueNoFromText,
  type TilkoCaseStatusResult,
} from "@/lib/tilko-api";

const BATCH_SIZE = 50;

// 틸코 외부 API(콜드스타트 시 지연) 호출이 있어 기본/짧은 타임아웃이면 recordCheck 도달 전
// 함수가 강제 종료돼 "체크는 됐는데 로그 없음"이 발생한다(2026-09-23 17시 누락 원인 추정).
// 콜드스타트+틸코 지연에도 첫 기록까지 도달하도록 180초로 상향(틸코 호출별 타임아웃과 병행).
export const dynamic = "force-dynamic";
export const maxDuration = 180;

function generateContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

// ── 감시 실행 로그 ──
// 변동 유무와 무관하게 매 프리체크 실행마다 1행 기록 → 이용자 마이페이지에서
// "하루 2회 성실히 감시 중"을 증명. 테이블 미생성/기록 실패 시에도 감시 본체는
// 계속되도록 조용히 무시한다(비치명적).
type CheckMethod = "precheck" | "full_doc" | "skipped";
type CheckResult = "no_change" | "signal_detected" | "changed" | "needs_registration" | "fetch_failed";

// ── cron 실행 heartbeat (AuditLog 재사용, 스키마 변경 없음) ──
// 매 실행 시작(start)·종료(done)·오류(error)를 1행씩 남긴다. 이후 감시 누락이
// "아예 실행 안 됨(플랫폼 스킵)=start 없음" vs "실행됐으나 중간 사망(함수 실패/타임아웃)
// =start만 있고 done 없음"을 즉시 구분할 수 있게 한다(2026-09-23 17시 누락은 로그가
// per-property뿐이라 이 구분이 불가능했음). 기록 실패해도 감시 본체는 계속(비치명적).
const CRON_HEARTBEAT_ACTION = "CRON_REGISTRY_MONITOR";
async function recordCronHeartbeat(
  phase: "start" | "done" | "error",
  detail?: Record<string, unknown>
): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        action: CRON_HEARTBEAT_ACTION,
        target: phase,
        detail: detail ? JSON.stringify(detail) : null,
        ipAddress: "system",
        userAgent: "cron/registry-monitor",
      },
    })
    .catch((e) => console.warn("[CRON:MONITOR] heartbeat 기록 실패:", e instanceof Error ? e.message : e));
}

async function recordCheck(
  propertyId: string,
  updateData: Prisma.MonitoredPropertyUpdateInput | null,
  method: CheckMethod,
  result: CheckResult,
  summary?: string,
  riskLevel?: "low" | "medium" | "high" | "critical"
): Promise<void> {
  // 감시 실행 로그는 "체크했으면 반드시 달력에 남는다"가 핵심이다.
  // 체크시각(lastCheckedAt 등) 갱신과 로그 기록을 **하나의 트랜잭션**으로 묶어,
  // 로그 기록이 실패하면 체크시각 갱신도 롤백되게 한다 → 다음 cron이 "미처리"로 보고
  // 재시도한다("정규 cron이 lastCheckedAt만 갱신하고 로그는 유실"되던 불일치를 원천 차단).
  // 일시적 DB 실패(서버리스 콜드스타트 커넥션 등)에는 재시도로 대응하고,
  // 최종 실패 시에는 조용히 삼키지 않고 원인을 로그로 남긴다(은폐 금지).
  const data = {
    monitoredPropertyId: propertyId,
    method,
    result,
    ...(summary ? { summary: summary.slice(0, 500) } : {}),
    ...(riskLevel ? { riskLevel } : {}),
  };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (updateData) {
        await prisma.$transaction([
          prisma.monitoredProperty.update({ where: { id: propertyId }, data: updateData }),
          prisma.monitoringCheckLog.create({ data }),
        ]);
      } else {
        await prisma.monitoringCheckLog.create({ data });
      }
      return;
    } catch (e) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 200 * attempt));
        continue;
      }
      // 3회 모두 실패 → cron 전체는 계속 진행하되(감시 자체를 막지 않음) 원인을 남긴다.
      console.error(
        `[CRON:MONITOR] recordCheck 실패 (property=${propertyId}, method=${method}, result=${result}):`,
        e instanceof Error ? e.message : e
      );
    }
  }
}

const RISK_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
function topRiskLevel(changes: ChangeDetection[]): "low" | "medium" | "high" | "critical" {
  return changes.reduce<"low" | "medium" | "high" | "critical">(
    (max, c) => (RISK_ORDER[c.riskLevel] > RISK_ORDER[max] ? c.riskLevel : max),
    "low"
  );
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

// ── Tilko 등기부등본 발급 조회 (확정 조회) ──
// 틸코/인터넷등기소 상류 장애로 보이는 오류인지 판별 (일시적 장애 vs 코드/권한 오류 구분)
function isUpstreamError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /\((5\d\d)\)|An error has occurred|timeout|ETIMEDOUT|ECONNRESET|fetch failed|network/i.test(msg);
}

async function fetchRegistryContent(
  address: string,
  options?: { simulate?: boolean; changeType?: string; baselineData?: string | null }
): Promise<{ text: string; raw?: Record<string, unknown> } | null> {
  // 시뮬레이션 모드: 외부 호출 없이 가짜 등기부 반환
  if (options?.simulate) {
    const text = generateSimulatedRegistry(
      options.baselineData ?? null,
      options.changeType || "mortgage_added"
    );
    return { text };
  }

  // Tilko 등기부등본 발급 (주소 기반)
  if (isTilkoRegistryDocAvailable()) {
    try {
      const result = await fetchRegistryDocumentByAddress({ address });
      return { text: result.text, raw: result.rawData };
    } catch (e) {
      console.error(`[CRON:MONITOR] Tilko 등기부 발급 실패: ${address}`, e instanceof Error ? e.message : e);
    }
  }

  // 폴백: 발급 불가 시 null 반환 → 변동 감지 skip
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

    // 파라미터 파싱
    const url = new URL(req.url);
    const simulate = url.searchParams.get("simulate") === "true";
    const changeType = url.searchParams.get("changeType") || "mortgage_added";
    const propertyIdFilter = url.searchParams.get("propertyId");
    // 프리체크(등기신청사건)를 건너뛰고 등기부등본 발급 확정 조회를 강제
    const forceFullDoc = url.searchParams.get("forceFullDoc") === "true";

    if (simulate) {
      console.log(`[CRON:MONITOR] 시뮬레이션 모드 — changeType=${changeType}, propertyId=${propertyIdFilter || "전체"}`);
    }

    // ── 재시도 회차 판정 ──
    // cron은 각 감시 시간대(KST 12·17시)에 :00,:10,…,:50 으로 10분 간격 실행된다.
    // :00 = 정규 회차(전체 감시). :10~:50 = 재시도 회차로, "이번 시간대에 이미
    // 실패(fetch_failed)한 물건만" 다시 시도한다(틸코가 그 순간만 느렸던 경우 회복).
    // 성공하면 마지막 로그가 성공으로 바뀌어 다음 회차에서 자동 제외된다.
    const now = new Date();
    const isRetrySlot = !simulate && !propertyIdFilter && now.getMinutes() >= 5;
    let retryTargetIds: string[] | null = null;
    if (isRetrySlot) {
      const windowStart = new Date(now);
      windowStart.setMinutes(0, 0, 0); // 이번 시간대 시작(:00)
      const recent = await prisma.monitoringCheckLog.findMany({
        where: { checkedAt: { gte: windowStart } },
        orderBy: { checkedAt: "desc" },
        select: { monitoredPropertyId: true, result: true },
      });
      const latest = new Map<string, string>();
      for (const r of recent) {
        if (!latest.has(r.monitoredPropertyId)) latest.set(r.monitoredPropertyId, r.result);
      }
      retryTargetIds = [...latest.entries()]
        .filter(([, res]) => res === "fetch_failed")
        .map(([id]) => id);
      if (retryTargetIds.length === 0) {
        // 이번 시간대에 재시도할 실패 물건 없음 → 틸코 호출 없이 조용히 종료
        return NextResponse.json({ message: "재시도 대상 없음", retrySlot: true, processed: 0 });
      }
    }

    // 실행 시작 heartbeat (재시도 판정 후 — 정규 회차 또는 재시도 대상 있을 때만)
    if (!simulate) {
      await recordCronHeartbeat("start", isRetrySlot ? { retrySlot: true, retryTargets: retryTargetIds?.length } : undefined);
    }

    // 전입일 지난 계약감시 → 일반 모드로 자동 전환
    await autoTransitionExpiredGaps();

    // 감시 실행 로그 보관정책: 90일 초과분 정리 (정규 회차에서만 — 재시도마다 반복 불필요)
    if (!isRetrySlot) {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      await prisma.monitoringCheckLog
        .deleteMany({ where: { checkedAt: { lt: ninetyDaysAgo } } })
        .catch(() => {});
      // heartbeat(AuditLog)도 90일 초과분 정리
      await prisma.auditLog
        .deleteMany({ where: { action: CRON_HEARTBEAT_ACTION, createdAt: { lt: ninetyDaysAgo } } })
        .catch(() => {});
    }

    // 물건 조회 필터 (시뮬레이션 propertyId 지정 시 해당 물건만 / 재시도 회차면 실패 물건만)
    const propertyFilter = {
      status: "active" as const,
      ...(propertyIdFilter ? { id: propertyIdFilter } : {}),
      ...(retryTargetIds ? { id: { in: retryTargetIds } } : {}),
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
      if (!simulate) await recordCronHeartbeat("done", { processed: 0, reason: "no_target" });
      return NextResponse.json({ message: "모니터링 대상 없음", processed: 0 });
    }

    let alertsCreated = 0;
    let notificationsSent = 0;
    let docFetches = 0;
    let tilkoPrechecks = 0;
    let tilkoSignals = 0;
    let skipped = 0;
    // 감시 보완: 등기부 발급(확정조회) 실패를 조용히 넘기지 않고 계측한다.
    let docFetchFailures = 0; // 확정조회 실패 총건 (그 주기 변동감지 스킵된 물건 수)
    let upstreamErrors = 0;   // 그중 상류(틸코/인터넷등기소) 장애로 보이는 건
    let precheckFailures = 0; // 프리체크 일시 실패(확정조회 폴백 없이 다음 주기 재시도)

    for (const prop of allProperties) {
      try {
        // commUniqueNo 없는 물건: 등기부 발급 API 폐기(2025 인터넷등기소 개편)로 직접 조회 불가.
        // 이용자가 등기부 PDF를 등록해 고유번호를 확보해야 프리체크(등기신청사건) 감시가 가능하다.
        // → 헛돌지 않도록 "PDF 등록 필요" 상태로 표시하고 스킵.
        if (!simulate && !prop.commUniqueNo) {
          await recordCheck(
            prop.id,
            { lastCheckedAt: new Date(), registrySignalStatus: "needs_registration" },
            "skipped",
            "needs_registration",
            "등기 고유번호 미등록 — 등기부 PDF 등록이 필요합니다"
          );
          skipped++;
          continue;
        }

        // (dead) 구 직접발급 경로 — 위 가드로 commUniqueNo 없는 물건은 도달하지 않음. 후속 제거 예정.
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
            const upstream = isUpstreamError(e);
            docFetchFailures++;
            if (upstream) upstreamErrors++;
            console.error(
              `[CRON:MONITOR] 확정조회(등기부 발급) 실패 → 이 주기 변동감지 스킵 [${upstream ? "상류장애" : "코드/권한오류"}]: ${prop.address}`,
              e instanceof Error ? e.message : e
            );
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
        // - 시뮬레이션/강제 확정조회: 아래 등기부 발급 경로로 진행
        if (!simulate && !forceFullDoc && isTilkoAvailable()) {
          try {
            const caseStatus = await fetchRegistryCaseStatus({
              reqAddress: prop.address,
              commUniqueNo: prop.commUniqueNo,
              ownerName: prop.ownerName,
            });
            tilkoPrechecks++;

            const now = new Date();
            if (!caseStatus.hasSignal) {
              await recordCheck(
                prop.id,
                { tilkoLastCaseCheckedAt: now, lastCheckedAt: now, registrySignalStatus: "idle" },
                "precheck",
                "no_change",
                "등기신청 사건 없음 — 이상 없음"
              );
              continue;
            }

            tilkoSignals++;
            const signalStatus = mapSignalStatus(caseStatus.phase);
            const shouldCreateSignalAlert =
              prop.registrySignalStatus !== signalStatus ||
              prop.registrySignalSummary !== caseStatus.summary;

            await recordCheck(
              prop.id,
              {
                tilkoLastCaseCheckedAt: now,
                lastCheckedAt: now,
                registrySignalStatus: signalStatus,
                registrySignalDetectedAt: prop.registrySignalDetectedAt || now,
                registrySignalSummary: caseStatus.summary,
                registrySignalRaw: caseStatus.rawData as Prisma.InputJsonValue,
              },
              "precheck",
              "signal_detected",
              caseStatus.summary,
              signalStatus === "dismissed" ? "low" : "medium"
            );

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

            if (shouldConfirmWithFullDoc(caseStatus)) {
              skipped++;
            }
            continue;
          } catch (tilkoError) {
            // 프리체크 일시 실패. 확정조회(등기부 발급)는 현재 "이용자 직접발급" 정책으로
            // 보류 상태라 폴백해도 반드시 실패한다 → 무의미한 발급 호출·틸코 포인트 낭비·
            // 달력에 "발급 실패(fetch_failed)"로 오해되는 것을 막기 위해 폴백하지 않고,
            // 프리체크 일시 오류로 기록한 뒤 다음 정규 주기에 자동 재시도한다.
            // (commUniqueNo 보유 물건은 프리체크가 정본 감시수단이라 확정조회 불필요.)
            console.warn(
              `[CRON:MONITOR] Tilko 프리체크 일시 실패 → 다음 주기 재시도(확정조회 폴백 안 함): ${prop.address}`,
              tilkoError instanceof Error ? tilkoError.message : tilkoError
            );
            precheckFailures++;
            await recordCheck(
              prop.id,
              { lastCheckedAt: new Date() },
              "precheck",
              "fetch_failed",
              "프리체크 일시 오류 — 다음 주기에 자동 재시도합니다"
            );
            continue;
          }
        }

        // Tilko 등기부등본 발급 확정 조회 (시뮬레이션 시 가짜 등기부 반환)
        const registry = await fetchRegistryContent(prop.address, simulate
          ? { simulate: true, changeType, baselineData: prop.baselineData }
          : undefined
        );

        if (!registry) {
          skipped++;
          if (!simulate) {
            docFetchFailures++; // 확정조회 실패로 이 주기 변동감지 스킵됨 (관측용 계측)
            console.warn(`[CRON:MONITOR] 확정조회 결과 없음 → 이 주기 변동감지 스킵: ${prop.address}`);
          }
          // 체크 시간 갱신 + 로그 기록 (조회 시도 기록). 시뮬레이션은 로그 없이 시각만 갱신.
          if (!simulate) {
            await recordCheck(
              prop.id,
              { lastCheckedAt: new Date() },
              "full_doc",
              "fetch_failed",
              "등기부 발급 조회 실패 — 다음 주기에 재시도합니다"
            );
          } else {
            await prisma.monitoredProperty.update({
              where: { id: prop.id },
              data: { lastCheckedAt: new Date() },
            });
          }
          continue;
        }

        docFetches++;
        const newHash = generateContentHash(registry.text);

        // 해시가 동일하면 변동 없음
        if (prop.lastHash === newHash) {
          await recordCheck(
            prop.id,
            { lastCheckedAt: new Date(), registrySignalStatus: "confirmed_no_change" },
            "full_doc",
            "no_change",
            "등기부등본 대조 결과 변동 없음 — 이상 없음"
          );
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

          // 알림 발송 조건: 긴급(high/critical) / 계약갭 모드 / 전세권·임차권 변동(세입자 핵심 신호)
          // general_change(medium)는 노이즈라 DB 기록만 남기고 푸시는 생략
          const isGap = prop.monitorMode === "contract_gap";
          const isUrgent = change.riskLevel === "high" || change.riskLevel === "critical";
          const isLeaseRight = change.changeType === "lease_right_changed";

          if (isUrgent || isGap || isLeaseRight) {
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
        const isRealChange = changes.some((change) => change.changeType !== "baseline_set");
        await recordCheck(
          prop.id,
          {
            lastCheckedAt: new Date(),
            lastHash: newHash,
            registrySignalStatus: isRealChange ? "confirmed_changed" : "confirmed_no_change",
            // 최초 조회 시 baseline 저장
            ...(!prop.baselineData ? { baselineData: registry.text } : {}),
          },
          "full_doc",
          isRealChange ? "changed" : "no_change",
          isRealChange ? changes.map((c) => c.summary).join(", ") : "최초 등기부 기준점 저장",
          isRealChange ? topRiskLevel(changes) : undefined
        );
      } catch (propError) {
        console.error(
          `[CRON:MONITOR] 개별 처리 실패: ${prop.address}`,
          propError instanceof Error ? propError.message : propError
        );
        // 예외로 빠진 물건도 "실행 시도"는 로그에 남긴다(감시 공백처럼 보이지 않도록).
        // 이 경로는 처리 실패라 안전하게 갱신할 상태가 없어 로그만 남긴다(updateData=null).
        await recordCheck(prop.id, null, "skipped", "fetch_failed", "처리 중 오류 발생 — 다음 주기에 재시도합니다");
      }
    }

    // 확정조회 실패가 처리 대상의 상당수면 상류(틸코/인터넷등기소) 장애 가능성 → 경고 로그로 노출
    if (!simulate && docFetchFailures > 0) {
      const rate = Math.round((docFetchFailures / allProperties.length) * 100);
      console.warn(
        `[CRON:MONITOR] ⚠️ 확정조회 실패 ${docFetchFailures}/${allProperties.length}건 (${rate}%), 상류장애 추정 ${upstreamErrors}건. ` +
        `해당 물건들은 이번 주기 변동감지가 스킵되어 다음 주기에 재시도됩니다.`
      );
    }

    if (!simulate) {
      await recordCronHeartbeat("done", {
        retrySlot: isRetrySlot,
        processed: allProperties.length,
        docFetches,
        docFetchFailures,
        precheckFailures,
        upstreamErrors,
        tilkoPrechecks,
        tilkoSignals,
        skipped,
        alertsCreated,
        notificationsSent,
      });
    }

    return NextResponse.json({
      message: "모니터링 완료",
      ...(simulate ? { simulation: true, changeType } : {}),
      retrySlot: isRetrySlot,
      processed: allProperties.length,
      gapMode: gapProperties.length,
      standardMode: standardProperties.length,
      docFetches,
      docFetchFailures,
      precheckFailures,
      upstreamErrors,
      tilkoPrechecks,
      tilkoSignals,
      skipped,
      alertsCreated,
      notificationsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON:MONITOR] 전체 오류:", error instanceof Error ? error.message : error);
    await recordCronHeartbeat("error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "모니터링 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
