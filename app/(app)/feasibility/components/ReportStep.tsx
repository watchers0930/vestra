"use client";

import Link from "next/link";
import { ExternalLink, RotateCcw, Shield, FileText, Calculator } from "lucide-react";
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

      {/* 보고서 미리보기 또는 shimmer */}
      {reportHtml ? (
        <FeasibilityReportPreview html={reportHtml} />
      ) : (
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f5f5f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={16} color="#1d1d1f" strokeWidth={1.5} />
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f", margin: 0 }}>보고서 미리보기</p>
              <p style={{ fontSize: "11px", color: "#86868b", margin: 0 }}>보고서를 생성하고 있습니다...</p>
            </div>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ height: "360px", borderRadius: "12px", background: "linear-gradient(110deg, #f5f5f7 30%, #e8e8ed 50%, #f5f5f7 70%)", backgroundSize: "200% 100%", animation: "report-shimmer 1.5s ease-in-out infinite" }} />
          </div>
        </div>
      )}

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
            ? <><span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "report-spin 0.8s linear infinite" }} /> 생성 중...</>
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

      {/* 관련 분석 CTA */}
      <div style={{ padding: "20px", borderRadius: "18px", background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: "10.5px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: "12px" }}>
          이 물건으로 추가 분석
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {[
            { href: "/rights", icon: Shield, label: "권리분석" },
            { href: "/contract", icon: FileText, label: "계약서 검토" },
            { href: "/tax", icon: Calculator, label: "세금 시뮬레이션" },
          ].map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "9px 16px", borderRadius: "12px",
                border: "1px solid rgba(0,0,0,0.08)", background: "#fff",
                fontSize: "13px", fontWeight: 500, color: "#1d1d1f", textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              <Icon size={15} strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <AiDisclaimer />
      <style>{`
        @keyframes report-spin { to { transform: rotate(360deg); } }
        @keyframes report-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}
