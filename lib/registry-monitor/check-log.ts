/**
 * 등기변동 모니터링 — 감시 실행 로그 & cron heartbeat
 * ─────────────────────────────────────────────
 * 매 체크마다 MonitoringCheckLog를 남기고, cron 실행 시작/종료/오류를
 * AuditLog에 heartbeat로 기록한다. registry-monitor cron에서 추출(동작 변경 없음).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ── 감시 실행 로그 ──
// 변동 유무와 무관하게 매 프리체크 실행마다 1행 기록 → 이용자 마이페이지에서
// "하루 2회 성실히 감시 중"을 증명. 테이블 미생성/기록 실패 시에도 감시 본체는
// 계속되도록 조용히 무시한다(비치명적).
export type CheckMethod = "precheck" | "full_doc" | "skipped";
export type CheckResult = "no_change" | "signal_detected" | "changed" | "needs_registration" | "fetch_failed";

// ── cron 실행 heartbeat (AuditLog 재사용, 스키마 변경 없음) ──
// 매 실행 시작(start)·종료(done)·오류(error)를 1행씩 남긴다. 이후 감시 누락이
// "아예 실행 안 됨(플랫폼 스킵)=start 없음" vs "실행됐으나 중간 사망(함수 실패/타임아웃)
// =start만 있고 done 없음"을 즉시 구분할 수 있게 한다(2026-09-23 17시 누락은 로그가
// per-property뿐이라 이 구분이 불가능했음). 기록 실패해도 감시 본체는 계속(비치명적).
export const CRON_HEARTBEAT_ACTION = "CRON_REGISTRY_MONITOR";

export async function recordCronHeartbeat(
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

export async function recordCheck(
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
