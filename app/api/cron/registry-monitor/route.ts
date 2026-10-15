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
 *
 * 순수 함수/헬퍼는 lib/registry-monitor/ 로 분리됨:
 *  - change-detection: 해시·변동 감지·위험도
 *  - simulation: 시뮬레이션/확정조회 등기부 획득
 *  - check-log: 감시 실행 로그 & cron heartbeat
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/cron-auth";
import { recordRegistrySnapshot } from "@/lib/registry-snapshot-recorder";
import { getSectionLabel } from "@/lib/registry-blockchain";
import {
  fetchRegistryCaseStatus,
  isTilkoAvailable,
  shouldConfirmWithFullDoc,
} from "@/lib/tilko-api";
import {
  generateContentHash,
  mapSignalStatus,
  detectChanges,
  topRiskLevel,
} from "@/lib/registry-monitor/change-detection";
import { fetchRegistryContent } from "@/lib/registry-monitor/simulation";
import {
  recordCheck,
  recordCronHeartbeat,
  CRON_HEARTBEAT_ACTION,
} from "@/lib/registry-monitor/check-log";
import { createAlertAndNotify } from "@/lib/registry-monitor/notify";

import { memberRetryTargetIds } from "@/lib/registry-monitor/retry-targets";
import { autoTransitionExpiredGaps } from "@/lib/registry-monitor/transition";
import { runGuestPrechecks, GUEST_BATCH_SIZE } from "@/lib/guest-monitoring/precheck-adapter";
const BATCH_SIZE = 50;

// 틸코 외부 API(콜드스타트 시 지연) 호출이 있어 기본/짧은 타임아웃이면 recordCheck 도달 전
// 함수가 강제 종료돼 "체크는 됐는데 로그 없음"이 발생한다(2026-09-23 17시 누락 원인 추정).
// 콜드스타트+틸코 지연에도 첫 기록까지 도달하도록 180초로 상향(틸코 호출별 타임아웃과 병행).
export const dynamic = "force-dynamic";
export const maxDuration = 180;

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
    // 실패(fetch_failed)한 물건만 다시 조회한다.
    // 성공하면 마지막 로그가 성공으로 바뀌어 다음 회차에서 자동 제외된다.
    const now = new Date();
    const isRetrySlot = !simulate && !propertyIdFilter && now.getMinutes() >= 5;
    const guest = !simulate && !propertyIdFilter ? await runGuestPrechecks(now).catch(() => {
      console.error("[CRON:MONITOR] guest_precheck_failed");
      // Partial work may already have consumed the entire guest quota.
      return { processed: GUEST_BATCH_SIZE, failed: 1 };
    }) : { processed: 0, failed: 0 };
    const memberBatchSize = BATCH_SIZE - guest.processed;
    let retryTargetIds: string[] | null = null;
    if (isRetrySlot) {
      retryTargetIds = await memberRetryTargetIds(now);
      if (retryTargetIds.length === 0) {
        // 이번 시간대에 재시도할 실패 물건 없음 → 틸코 호출 없이 조용히 종료
        return NextResponse.json({ message: "재시도 대상 없음", retrySlot: true, processed: 0, guest });
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
          take: Math.floor(memberBatchSize / 2),
          orderBy: { lastCheckedAt: "asc" },
          include: { user: { select: { id: true, email: true } } },
        });

    const standardProperties = await prisma.monitoredProperty.findMany({
      where: propertyIdFilter
        ? propertyFilter
        : { ...propertyFilter, monitorMode: "standard" },
      take: memberBatchSize - gapProperties.length,
      orderBy: { lastCheckedAt: "asc" },
      include: { user: { select: { id: true, email: true } } },
    });

    const allProperties = [...gapProperties, ...standardProperties];

    if (allProperties.length === 0) {
      if (!simulate) await recordCronHeartbeat("done", { processed: 0, reason: "no_target" });
      return NextResponse.json({ message: "모니터링 대상 없음", processed: 0, guest });
    }

    let alertsCreated = 0;
    let notificationsSent = 0;
    let docFetches = 0;
    let tilkoPrechecks = 0;
    let tilkoSignals = 0;
    let skipped = 0;
    // 감시 보완: 등기부 발급(확정조회) 실패를 조용히 넘기지 않고 계측한다.
    let docFetchFailures = 0; // 확정조회 실패 총건 (그 주기 변동감지 스킵된 물건 수)
    const upstreamErrors = 0; // 상류(틸코/인터넷등기소) 장애로 보이는 건 (구 직접발급 경로 제거로 현재 미사용·관측 호환 유지)
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
              const r = await createAlertAndNotify({
                propertyId: prop.id,
                userId: prop.userId,
                changeType: signalStatus === "dismissed" ? "case_dismissed" : "case_detected",
                summary: caseStatus.summary,
                alertDetail:
                  signalStatus === "pending_confirm"
                    ? "등기신청 사건 처리가 완료된 것으로 감지되었습니다. 최신 등기부 확정조회로 실제 반영 내용을 확인합니다."
                    : "등기 변경으로 이어질 수 있는 신청 사건이 감지되었습니다. 아직 등기부등본 반영 여부는 확정 전입니다.",
                riskLevel: signalStatus === "dismissed" ? "low" : "medium",
                notify: true,
                notification: {
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
                },
              });
              alertsCreated += r.alertsCreated;
              notificationsSent += r.notificationsSent;
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
          // 알림 발송 조건: 긴급(high/critical) / 계약갭 모드 / 전세권·임차권 변동(세입자 핵심 신호)
          // general_change(medium)는 노이즈라 DB 기록만 남기고 푸시는 생략
          const isGap = prop.monitorMode === "contract_gap";
          const isUrgent = change.riskLevel === "high" || change.riskLevel === "critical";
          const isLeaseRight = change.changeType === "lease_right_changed";
          const shouldNotify = isUrgent || isGap || isLeaseRight;

          const prefix = isGap ? "[긴급:계약감시]" : "[VESTRA]";
          const suffix = isGap && isUrgent
            ? "\n\n⚠️ 계약~전입 기간 중 등기 변동입니다. 즉시 확인하세요.\n💡 dgon에서 긴급 전세권 설정 등기를 진행할 수 있습니다."
            : "";

          const r = await createAlertAndNotify({
            propertyId: prop.id,
            userId: prop.userId,
            changeType: change.changeType,
            summary: change.summary,
            alertDetail: change.detail + sectionInfo,
            riskLevel: change.riskLevel,
            notify: shouldNotify,
            notification: {
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
            },
          });
          alertsCreated += r.alertsCreated;
          notificationsSent += r.notificationsSent;
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
      guest,
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
