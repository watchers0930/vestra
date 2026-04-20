"use client";

import { ExternalLink, RotateCcw } from "lucide-react";
import AiDisclaimer from "@/components/common/ai-disclaimer";
import { FeasibilityScoreSummary } from "@/components/feasibility/FeasibilityScoreSummary";
import { FeasibilityReportPreview } from "@/components/feasibility/FeasibilityReportPreview";
import { ClaimVerificationTable } from "@/components/feasibility/ClaimVerificationTable";
import { RationalityBandChart } from "@/components/feasibility/RationalityBandChart";
import { ChapterReview } from "@/components/feasibility/ChapterReview";
import type { FeasibilityScore, ChapterOpinion, VerificationResult, RationalityItem } from "@/lib/feasibility/feasibility-types";

interface Props {
  vScore: FeasibilityScore;
  chapters: ChapterOpinion[];
  verifications: VerificationResult[];
  rationalityItems: RationalityItem[];
  reportHtml: string | null;
  loading: boolean;
  onOpenReport: () => void;
  onReset: () => void;
}

export function ReportStep({ vScore, chapters, verifications, rationalityItems, reportHtml, loading, onOpenReport, onReset }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <FeasibilityScoreSummary score={vScore} chapters={chapters} />
      <ClaimVerificationTable claims={verifications} />
      <RationalityBandChart items={rationalityItems} />

      {/* 장별 검토 의견 */}
      <div>
        <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6e6e73", margin: "0 0 12px 4px" }}>장별 검토 의견</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {chapters.map((ch) => <ChapterReview key={ch.chapterId} chapter={ch} />)}
        </div>
      </div>

      {reportHtml && <FeasibilityReportPreview html={reportHtml} />}

      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: "12px", paddingTop: "4px" }}>
        <button
          onClick={onOpenReport}
          disabled={loading}
          style={{
            flex: 1, padding: "14px", borderRadius: "14px", border: "none",
            background: loading ? "#e5e5e7" : "linear-gradient(148deg, #0071e3, #0058b0)",
            color: loading ? "#aeaeb2" : "#fff",
            fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            boxShadow: loading ? "none" : "0 4px 16px rgba(0,113,227,0.30)",
          }}
        >
          {loading
            ? <><span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> 생성 중...</>
            : <><ExternalLink size={16} strokeWidth={2} /> 보고서 열기 / PDF 저장</>
          }
        </button>
        <button
          onClick={onReset}
          style={{
            padding: "14px 20px", borderRadius: "14px", border: "1px solid rgba(0,0,0,0.10)",
            background: "#f5f5f7", color: "#3d3d3f",
            fontSize: "14px", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: "8px",
          }}
        >
          <RotateCcw size={16} strokeWidth={2} /> 새 분석
        </button>
      </div>

      <AiDisclaimer />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
