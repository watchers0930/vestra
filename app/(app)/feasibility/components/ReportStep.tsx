"use client";

import { ExternalLink, RotateCcw } from "lucide-react";
import { Button } from "@/components/common";
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
    <div className="space-y-5">
      <FeasibilityScoreSummary score={vScore} chapters={chapters} />
      <ClaimVerificationTable claims={verifications} />
      <RationalityBandChart items={rationalityItems} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#6e6e73] uppercase tracking-wider px-1">장별 검토 의견</h2>
        {chapters.map((ch) => (
          <ChapterReview key={ch.chapterId} chapter={ch} />
        ))}
      </div>

      {reportHtml && <FeasibilityReportPreview html={reportHtml} />}

      <div className="flex gap-3 pt-2">
        <Button onClick={onOpenReport} loading={loading} icon={ExternalLink} size="lg" className="flex-1">
          보고서 열기 / PDF 저장
        </Button>
        <Button onClick={onReset} variant="secondary" icon={RotateCcw} size="lg">
          새 분석
        </Button>
      </div>

      <AiDisclaimer />
    </div>
  );
}
