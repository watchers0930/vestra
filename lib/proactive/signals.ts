/**
 * 능동 인사이트 — 신호(Signal) 수집기
 * ────────────────────────────────────
 * 사용자의 자산·계약·등기감시·구독을 DB에서 훑어 "지금 신경 써야 할 것"을
 * 규칙 기반으로 추출한다. **AI를 쓰지 않는다** — 순수하게 사실만 뽑는다.
 * (AI 종합은 lib/proactive/briefing.ts가 담당)
 *
 * 견고성(규칙 0-5):
 *  - 규모: 각 쿼리에 take 상한, 최종 결과도 MAX_SIGNALS로 절단.
 *  - 비정상: 각 소스는 독립 try/catch — 한 소스 실패가 전체 브리핑을 깨지 않는다.
 *  - 적대적: 반드시 userId로만 스코프 (본인 데이터만).
 *
 * @module lib/proactive/signals
 */

import { prisma } from "@/lib/prisma";
import type { Signal } from "./types";
import { SEVERITY_RANK } from "./types";

/** 최종 반환 신호 상한 (AI 입력 토큰·UI 과밀 방지) */
const MAX_SIGNALS = 12;

/** 계약 만료를 미리 알릴 창(일). 지난 계약은 GRACE_DAYS까지만 노출. */
const CONTRACT_HORIZON_DAYS = 60;
const CONTRACT_GRACE_DAYS = 7;
/** 구독 만료 사전 안내 창(일) */
const SUB_HORIZON_DAYS = 14;
/** 안전도 이 값 미만이면 고위험 자산으로 경고 */
const LOW_SAFETY_THRESHOLD = 40;

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/** 미확인 등기 변동 알림 → 신호 */
async function fromRegistryAlerts(userId: string): Promise<Signal[]> {
  try {
    const alerts = await prisma.monitoringAlert.findMany({
      where: { isRead: false, monitoredProperty: { userId } },
      select: {
        changeType: true,
        summary: true,
        riskLevel: true,
        createdAt: true,
        monitoredProperty: { select: { address: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return alerts.map((a) => {
      const severity =
        a.riskLevel === "critical"
          ? "critical"
          : a.riskLevel === "high"
            ? "high"
            : "medium";
      return {
        kind: "registry_alert",
        severity,
        title: `등기 변동 미확인: ${a.monitoredProperty.address}`,
        detail: `${a.summary} (감지 ${a.createdAt.toISOString().slice(0, 10)}, 위험도 ${a.riskLevel})`,
        actionUrl: "/profile?tab=monitoring",
        actionLabel: "등기감시 확인",
      };
    });
  } catch {
    return [];
  }
}

/** 임대차 계약 만료 임박 (임대인·임차인 양쪽) → 신호 */
async function fromContractExpiry(userId: string, now: Date): Promise<Signal[]> {
  try {
    const floor = new Date(now.getTime() - CONTRACT_GRACE_DAYS * 86400000);
    const horizon = new Date(now.getTime() + CONTRACT_HORIZON_DAYS * 86400000);
    const contracts = await prisma.eContract.findMany({
      where: {
        status: "COMPLETED",
        contractType: { in: ["JEONSE", "MONTHLY"] },
        endDate: { gte: floor, lte: horizon },
        OR: [{ landlordId: userId }, { tenantId: userId }],
      },
      select: {
        address: true,
        endDate: true,
        landlordId: true,
      },
      orderBy: { endDate: "asc" },
      take: 20,
    });

    return contracts
      .filter((c) => c.endDate)
      .map((c) => {
        const dday = daysBetween(now, c.endDate!);
        const isLandlord = c.landlordId === userId;
        const severity = dday <= 14 ? "high" : dday <= 30 ? "medium" : "info";
        const ddayText = dday >= 0 ? `D-${dday}` : `만료 ${-dday}일 경과`;
        const roleHint = isLandlord
          ? "보증금 반환·재계약 준비를 확인하세요."
          : "보증금 반환 준비가 필요하면 내용증명을 미리 준비하세요.";
        return {
          kind: "contract_expiry" as const,
          severity,
          title: `임대차 계약 만료 ${ddayText}: ${c.address}`,
          detail: `만료 예정일 ${c.endDate!.toISOString().slice(0, 10)}. ${roleHint}`,
          actionUrl: "/renewal/keepzip",
          actionLabel: "만료 대응 준비",
        };
      });
  } catch {
    return [];
  }
}

/** 구독 만료 임박 → 신호 */
async function fromSubscription(userId: string, now: Date): Promise<Signal[]> {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, status: true, endDate: true },
    });
    if (!sub || sub.plan === "FREE" || sub.status !== "active" || !sub.endDate) {
      return [];
    }
    const dday = daysBetween(now, sub.endDate);
    if (dday < 0 || dday > SUB_HORIZON_DAYS) return [];
    return [
      {
        kind: "subscription_expiry",
        severity: "medium",
        title: `${sub.plan} 구독 만료 D-${dday}`,
        detail: `구독이 ${sub.endDate.toISOString().slice(0, 10)}에 만료됩니다. 갱신하지 않으면 프리미엄 기능 이용이 제한됩니다.`,
        actionUrl: "/profile",
        actionLabel: "구독 관리",
      },
    ];
  } catch {
    return [];
  }
}

/** 고위험·미분석 보유 자산 → 신호 */
async function fromAssets(userId: string): Promise<Signal[]> {
  try {
    // 관심 대상(안전도 임계 미만 = 미분석0 + 고위험1~39)만, 위험한 것부터 정렬해 가져온다.
    // (전량 take 후 앱레벨 slice 하면 자산이 많을 때 최고위험 자산이 누락될 수 있음)
    const assets = await prisma.asset.findMany({
      where: { userId, safetyScore: { lt: LOW_SAFETY_THRESHOLD } },
      select: { address: true, safetyScore: true, riskScore: true },
      orderBy: { safetyScore: "asc" },
      take: 20,
    });

    const highRisk: Signal[] = [];
    const unanalyzed: Signal[] = [];
    for (const a of assets) {
      if (a.safetyScore === 0) {
        // 아직 분석 안 된 자산 (주소만 등록)
        unanalyzed.push({
          kind: "unanalyzed_asset",
          severity: "info",
          title: `미분석 자산: ${a.address}`,
          detail: "안전도가 산출되지 않았습니다. 권리분석으로 위험 요소를 확인하세요.",
          actionUrl: "/renewal/rights",
          actionLabel: "권리분석 하기",
        });
      } else if (a.safetyScore < LOW_SAFETY_THRESHOLD) {
        highRisk.push({
          kind: "high_risk_asset",
          severity: "high",
          title: `안전도 낮은 자산: ${a.address}`,
          detail: `안전도 ${a.safetyScore}점 / 위험도 ${a.riskScore}점. 보증금 보호 조치를 점검하세요.`,
          actionUrl: "/renewal/rights",
          actionLabel: "위험 점검",
        });
      }
    }
    // 고위험 상위 5, 미분석 상위 3만
    return [...highRisk.slice(0, 5), ...unanalyzed.slice(0, 3)];
  } catch {
    return [];
  }
}

/**
 * 사용자의 모든 능동 신호를 수집해 심각도순으로 정렬·절단한다.
 * @param userId 인증된 사용자 ID (반드시 세션에서 전달 — 본인 데이터만)
 */
export async function collectSignals(userId: string): Promise<Signal[]> {
  const now = new Date();
  const groups = await Promise.all([
    fromRegistryAlerts(userId),
    fromContractExpiry(userId, now),
    fromSubscription(userId, now),
    fromAssets(userId),
  ]);
  const all = groups.flat();
  all.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  return all.slice(0, MAX_SIGNALS);
}
