"use client";

/**
 * HighRiskSummary — 고위험 요약 영역 (설계 §4.2 ⑤)
 *
 * 안전점수와 분리된 독립 경고 영역. 결정적 고위험 사유(decisiveHighRisk)와
 * critical/high 위험요인·danger 위험항목을 한데 모아 "즉시 확인할 위험"을
 * 화면 최초 영역에서 노출한다. 색상 외 아이콘·제목·텍스트로도 구분한다.
 *
 * 고위험이 하나도 없으면 null을 반환한다 — 임의의 "안전/계약 가능" 결론을
 * 만들지 않기 위함(설계 §4.2, 기획 §4.5).
 */
import { ShieldAlert, AlertTriangle } from "lucide-react";

import type { UnifiedResult } from "./rights-result-types";

const BASIS_LABEL: Record<string, string> = {
  ratioToMarket: "시세 대비 선순위",
  ratioToDeposit: "보증금 대비 선순위",
};

interface Props {
  result: UnifiedResult;
  /** 상세 위험 목록으로 이동할 대상 DOM id */
  detailTargetId?: string;
}

export function HighRiskSummary({ result, detailTargetId = "rights-risk-detail" }: Props) {
  const decisive = result.riskScore?.decisiveHighRisk ?? null;
  const factors = (result.riskScore?.factors ?? [])
    .filter((f) => f.severity === "critical" || f.severity === "high")
    // decisive(선순위 부담 고위험)가 비율과 함께 선순위 부담 전체를 대표하므로, 같은 부담의 선순위채권·근저당
    // factor는 중복 경고다(1사유=1경고). 근저당 단독 고비율도 decisive로 집계되므로 mortgage factor도 제외(#6).
    .filter((f) => !(decisive && (f.category === "선순위채권" || f.category === "근저당"
      || String(f.id ?? "").startsWith("total_claims") || String(f.id ?? "").startsWith("mortgage_"))));
  const dangerRisks = result.riskAnalysis.risks
    .filter((r) => r.level === "danger")
    // decisive(선순위 부담 고위험)가 대표하는 동일 채권부담 사유(선순위·근저당)가 risks에도 복제돼 있으면
    // 중복 경고가 되므로 제외(#6).
    .filter((r) => !(decisive && (r.title.includes("선순위") || r.title.includes("근저당") || r.title.includes(decisive.reason))));

  const reasons: string[] = [];
  if (decisive) {
    const basis = BASIS_LABEL[decisive.basis] ?? "선순위 부담";
    reasons.push(`${decisive.reason} — ${basis} ${decisive.ratio.toFixed(1)}%`);
  }
  factors.forEach((f) => reasons.push(f.description));
  dangerRisks.forEach((r) => reasons.push(r.title));
  const uniqueReasons = Array.from(new Set(reasons));

  if (uniqueReasons.length === 0) return null;

  const scrollToDetail = () => {
    const el = document.getElementById(detailTargetId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      role="region"
      aria-label="고위험 경고 요약"
      className="rounded-xl border-2 border-red-300 bg-red-50 p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert size={22} strokeWidth={2} className="mt-0.5 flex-shrink-0 text-red-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-red-800">
              고위험 경고 {uniqueReasons.length}건
            </h3>
          </div>
          <p className="mt-1 text-xs text-red-700">
            계약 전 아래 위험을 반드시 확인하세요. 안전점수와 별개로 즉시 검토가 필요합니다.
          </p>

          <ul className="mt-3 space-y-1.5">
            {uniqueReasons.slice(0, 5).map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 flex-shrink-0 text-red-500" aria-hidden />
                <span className="break-words">{reason}</span>
              </li>
            ))}
            {uniqueReasons.length > 5 && (
              <li className="pl-6 text-xs text-red-600">외 {uniqueReasons.length - 5}건 — 상세 목록에서 확인</li>
            )}
          </ul>

          <button
            type="button"
            onClick={scrollToDetail}
            className="mt-4 inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
          >
            상세 위험 근거 확인 →
          </button>
        </div>
      </div>
    </div>
  );
}
