/**
 * 능동 인사이트 브리핑 테스트
 * - signals.collectSignals: 소스별 매핑, 심각도 정렬, 절단, graceful 실패
 * - briefing: fallbackBriefing / generateBriefing(빈 배열·AI 실패 폴백)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── prisma mock (hoisted) ──
const m = vi.hoisted(() => ({
  alertFind: vi.fn(),
  contractFind: vi.fn(),
  subFind: vi.fn(),
  assetFind: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    monitoringAlert: { findMany: m.alertFind },
    eContract: { findMany: m.contractFind },
    subscription: { findUnique: m.subFind },
    asset: { findMany: m.assetFind },
  },
}));

// ── openai mock: 기본은 throw → generateBriefing 폴백 경로 검증 ──
const oa = vi.hoisted(() => ({ getClient: vi.fn() }));
vi.mock("@/lib/openai", () => ({
  getOpenAIClient: oa.getClient,
  OPENAI_MODEL: "gpt-5-mini",
  REASONING_ANALYTICAL: "medium",
}));

import { collectSignals } from "@/lib/proactive/signals";
import { generateBriefing, fallbackBriefing } from "@/lib/proactive/briefing";
import type { Signal } from "@/lib/proactive/types";

beforeEach(() => {
  m.alertFind.mockReset().mockResolvedValue([]);
  m.contractFind.mockReset().mockResolvedValue([]);
  m.subFind.mockReset().mockResolvedValue(null);
  m.assetFind.mockReset().mockResolvedValue([]);
  oa.getClient.mockReset().mockImplementation(() => {
    throw new Error("no-ai-in-test");
  });
});

describe("collectSignals", () => {
  it("소스별 신호를 매핑하고 심각도순으로 정렬한다", async () => {
    m.alertFind.mockResolvedValue([
      {
        changeType: "seizure_added",
        summary: "압류 등기 감지",
        riskLevel: "critical",
        createdAt: new Date("2026-09-20"),
        monitoredProperty: { address: "서울 강남구 A" },
      },
    ]);
    m.assetFind.mockResolvedValue([
      { address: "서울 마포구 B", safetyScore: 30, riskScore: 70 }, // high
      { address: "서울 송파구 C", safetyScore: 0, riskScore: 0 }, // info(미분석)
    ]);

    const signals = await collectSignals("u1");
    // critical(등기) → high(자산) → info(미분석) 순
    expect(signals[0].severity).toBe("critical");
    expect(signals[0].kind).toBe("registry_alert");
    expect(signals.some((s) => s.kind === "high_risk_asset")).toBe(true);
    expect(signals.some((s) => s.kind === "unanalyzed_asset")).toBe(true);
    // 정렬 단조성 검증
    const rank = { critical: 0, high: 1, medium: 2, info: 3 } as const;
    for (let i = 1; i < signals.length; i++) {
      expect(rank[signals[i].severity]).toBeGreaterThanOrEqual(rank[signals[i - 1].severity]);
    }
  });

  it("한 소스가 실패해도 다른 소스 신호는 반환한다(graceful)", async () => {
    m.alertFind.mockRejectedValue(new Error("db down"));
    m.assetFind.mockResolvedValue([{ address: "X", safetyScore: 10, riskScore: 90 }]);
    const signals = await collectSignals("u1");
    expect(signals.length).toBe(1);
    expect(signals[0].kind).toBe("high_risk_asset");
  });

  it("최대 12개로 절단한다", async () => {
    // 안전도 낮은 자산은 상위 5개만 채택되므로, 등기 알림 20건으로 상한 검증
    m.alertFind.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({
        changeType: "mortgage_added",
        summary: `근저당 ${i}`,
        riskLevel: "high",
        createdAt: new Date("2026-09-20"),
        monitoredProperty: { address: `addr ${i}` },
      }))
    );
    const signals = await collectSignals("u1");
    expect(signals.length).toBe(12);
  });

  it("FREE 플랜·비활성 구독은 신호를 만들지 않는다", async () => {
    m.subFind.mockResolvedValue({ plan: "FREE", status: "active", endDate: new Date() });
    const s1 = await collectSignals("u1");
    expect(s1.some((s) => s.kind === "subscription_expiry")).toBe(false);
  });
});

describe("briefing", () => {
  it("fallbackBriefing: 빈 배열은 특이사항 없음", () => {
    expect(fallbackBriefing([]).headline).toContain("확인할 사항이 없");
    expect(fallbackBriefing([]).aiUsed).toBe(false);
  });

  it("fallbackBriefing: 신호가 있으면 건수와 최우선 항목을 담는다", () => {
    const signals: Signal[] = [
      { kind: "registry_alert", severity: "critical", title: "압류 감지", detail: "d", actionUrl: "/x", actionLabel: "보기" },
    ];
    const b = fallbackBriefing(signals);
    expect(b.headline).toContain("압류 감지");
    expect(b.headline).toContain("시급");
  });

  it("generateBriefing: 빈 배열이면 AI를 호출하지 않는다", async () => {
    const b = await generateBriefing([]);
    expect(b.aiUsed).toBe(false);
    expect(oa.getClient).not.toHaveBeenCalled();
  });

  it("generateBriefing: AI 실패 시 규칙 기반 폴백(aiUsed=false)", async () => {
    const signals: Signal[] = [
      { kind: "high_risk_asset", severity: "high", title: "안전도 낮은 자산", detail: "d", actionUrl: "/x", actionLabel: "점검" },
    ];
    const b = await generateBriefing(signals);
    expect(b.aiUsed).toBe(false);
    expect(b.headline).toContain("안전도 낮은 자산");
  });
});
