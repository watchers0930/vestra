"use client";

import { AlertTriangle } from "lucide-react";
import type { AnalysisResult } from "@/app/(app)/contract/types";
import { GAUGE_CIRC, formatAmount, scoreMeta, severityMeta, sumCardKey, sumSevKey, type Styles } from "./resultHelpers";

interface Props {
  s: Styles;
  result: AnalysisResult;
  address: string;
  onReanalyze: () => void;
}

export default function ContractScoreHero({ s, result, address, onReanalyze }: Props) {
  const info = result.extractedInfo;
  const issues = result.reviewIssues ?? [];
  const clauses = result.clauses ?? [];
  const missing = result.missingClauses ?? [];

  const meta = scoreMeta(result.safetyScore);
  const dashOffset = GAUGE_CIRC * (1 - Math.max(0, Math.min(100, result.safetyScore)) / 100);

  const dangerCount = clauses.filter((c) => c.riskLevel === "high").length;
  const warningCount = clauses.filter((c) => c.riskLevel === "warning").length;
  const safeCount = clauses.filter((c) => c.riskLevel === "safe").length;
  const total = clauses.length || 1;
  const dangerPct = (dangerCount / total) * 100;
  const warningPct = (warningCount / total) * 100;
  const safePct = (safeCount / total) * 100;

  const topIssues = issues.slice(0, 3);

  return (
    <>
      {/* Topbar */}
      <div className={s.resultTopbar}>
        <div className={s.resultMeta}>
          <strong>{address}</strong><br />
          계약검토 · 분석 완료
        </div>
        <div className={s.resultActions}>
          <button className={s.rBtnOutline}>PDF 저장</button>
          <button className={s.rBtnPrimary} onClick={onReanalyze}>다시 분석</button>
        </div>
      </div>

      {/* Score Hero 2-col */}
      <div className={s.scoreHeroV2}>
        {/* Left: gauge + grade + AI opinion */}
        <div className={s.shLeft}>
          <div className={s.shGaugeRow}>
            <div className={s.gaugeWrap}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle className={s.gaugeBg} cx="50" cy="50" r="40" />
                <circle
                  className={s.gaugeFg}
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={meta.color}
                  strokeDasharray={`${GAUGE_CIRC}`}
                  strokeDashoffset={`${dashOffset.toFixed(2)}`}
                />
              </svg>
              <div className={s.gaugeScore}>
                <span className={s.gaugeNum} style={{ color: meta.color }}>{result.safetyScore}</span>
                <span className={s.gaugeLabel} style={{ color: meta.color }}>{meta.label}</span>
              </div>
            </div>
            <div className={s.shGradeInfo}>
              <span className={`${s.shGradeBadge} ${s[meta.badgeClassKey] ?? s.sgbCaution}`}>
                <AlertTriangle size={12} /> {meta.label} — 계약 전 검토 필요
              </span>
              {info?.propertyAddress && <div className={s.shProp}>{info.propertyAddress}</div>}
              {(info?.depositAmount || info?.monthlyRentAmount) && (
                <div className={s.shMeta}>
                  {formatAmount(info?.depositAmount) && `보증금 ${formatAmount(info?.depositAmount)}`}
                  {info?.monthlyRentAmount ? ` · 월세 ${formatAmount(info?.monthlyRentAmount)}` : ""}
                </div>
              )}
            </div>
          </div>
          {result.aiOpinion && (
            <div className={s.shAiBox}>
              <div className={s.shAiLabel}>AI 종합 의견</div>
              <div className={s.shAiText}>{result.aiOpinion}</div>
            </div>
          )}
        </div>

        {/* Right: stacked bar + summary */}
        <div className={s.shRight}>
          <div className={s.shBarSection}>
            <div className={s.shBarLabelRow}>
              <span className={s.shBarTitle}>조항 분포</span>
              <div className={s.shBarLegend}>
                <span className={`${s.shLegendDot} ${s.ldDanger}`}>위험</span>
                <span className={`${s.shLegendDot} ${s.ldWarning}`}>주의</span>
                <span className={`${s.shLegendDot} ${s.ldSafe}`}>안전</span>
              </div>
            </div>
            <div className={s.shStackedBar}>
              <div className={`${s.sbSeg} ${s.sbDanger}`} style={{ width: `${dangerPct}%` }}></div>
              <div className={`${s.sbSeg} ${s.sbWarning}`} style={{ width: `${warningPct}%` }}></div>
              <div className={`${s.sbSeg} ${s.sbSafe}`} style={{ width: `${safePct}%` }}></div>
            </div>
            <div className={s.shBarCounts}>
              <div className={s.shCountItem}>
                <div className={`${s.shCountN} ${s.shcDanger}`}>{dangerCount}</div>
                <div className={s.shCountL}>위험 조항</div>
              </div>
              <div className={s.shCountItem}>
                <div className={`${s.shCountN} ${s.shcWarning}`}>{warningCount}</div>
                <div className={s.shCountL}>주의 조항</div>
              </div>
              <div className={s.shCountItem}>
                <div className={`${s.shCountN} ${s.shcSafe}`}>{safeCount}</div>
                <div className={s.shCountL}>안전 조항</div>
              </div>
              <div className={s.shCountItem}>
                <div className={`${s.shCountN} ${s.shcMissing}`}>{missing.length}</div>
                <div className={s.shCountL}>누락 조항</div>
              </div>
            </div>
          </div>

          {topIssues.length > 0 && (
            <div>
              <div className={s.shSummaryTitle}>즉시 확인 필요</div>
              <div className={s.shSummaryCards}>
                {topIssues.map((issue) => (
                  <div key={issue.id} className={`${s.shSumCard} ${s[sumCardKey[issue.severity]] ?? s.scWarning}`}>
                    <span className={`${s.shSumSev} ${s[sumSevKey[issue.severity]] ?? s.sscWarning}`}>
                      {severityMeta[issue.severity]?.label ?? "확인"}
                    </span>
                    <span className={s.shSumText}>{issue.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
