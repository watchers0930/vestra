/**
 * 등기변동 감지 (순수 함수)
 * ─────────────────────────────────────────────
 * 등기부 원문 텍스트를 비교해 변동 유형·위험도를 분류한다.
 * registry-monitor cron에서 추출(동작 변경 없음).
 */

import { createHash } from "crypto";
import type { TilkoCaseStatusResult } from "@/lib/tilko-api";

export function generateContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function mapSignalStatus(phase: TilkoCaseStatusResult["phase"]): string {
  if (phase === "completed") return "pending_confirm";
  if (phase === "dismissed") return "dismissed";
  return "case_detected";
}

// ── 변동 유형 감지 (상세 분석) ──
export interface ChangeDetection {
  changeType: string;
  summary: string;
  detail: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

const RISK_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export function topRiskLevel(changes: ChangeDetection[]): "low" | "medium" | "high" | "critical" {
  return changes.reduce<"low" | "medium" | "high" | "critical">(
    (max, c) => (RISK_ORDER[c.riskLevel] > RISK_ORDER[max] ? c.riskLevel : max),
    "low"
  );
}

export function detectChanges(oldContent: string | null, newContent: string): ChangeDetection[] {
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
