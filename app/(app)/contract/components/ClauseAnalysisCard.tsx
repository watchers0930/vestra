"use client";

import { cn } from "@/lib/utils";
import { Card, Badge } from "@/components/common";
import { riskBadgeVariant, riskBadgeLabel, riskBadgeIcon, borderForRisk } from "../constants";
import type { AnalyzedClause } from "../types";

interface Props {
  clauses: AnalyzedClause[];
}

export function ClauseAnalysisCard({ clauses }: Props) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 text-base font-semibold text-[#1d1d1f]">조항별 분석 결과</h2>
      <div className="space-y-4">
        {clauses.map((clause, idx) => {
          const Icon = riskBadgeIcon[clause.riskLevel];
          return (
            <div
              key={idx}
              className={cn(
                "rounded-lg border border-[#e5e5e7] border-l-4 bg-[#f5f5f7]/50 p-4",
                borderForRisk(clause.riskLevel)
              )}
            >
              <div className="mb-2 flex items-center gap-3">
                <h3 className="text-sm font-semibold text-[#1d1d1f]">{clause.title}</h3>
                <Badge variant={riskBadgeVariant[clause.riskLevel]} icon={Icon} size="md">
                  {riskBadgeLabel[clause.riskLevel]}
                </Badge>
              </div>
              {clause.content && (
                <p className="mb-2 rounded bg-white px-3 py-2 text-xs leading-relaxed text-[#6e6e73] ring-1 ring-[#e5e5e7]">
                  {clause.content}
                </p>
              )}
              <p className="text-sm leading-relaxed text-[#1d1d1f]">{clause.analysis}</p>
              {clause.relatedLaw && (
                <p className="mt-2 text-xs text-[#6e6e73]">
                  <span className="font-medium text-[#6e6e73]">관련 법규:</span>{" "}
                  {clause.relatedLaw}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
