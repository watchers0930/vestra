"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Badge } from "@/components/common";
import type { MissingClause } from "../types";

interface Props {
  missingClauses: MissingClause[];
}

export function MissingClausesCard({ missingClauses }: Props) {
  if (missingClauses.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[#1d1d1f]">
        <AlertTriangle size={18} className="text-amber-500" />
        누락된 중요 조항
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {missingClauses.map((mc, idx) => (
          <div
            key={idx}
            className={cn(
              "rounded-lg border p-4",
              mc.importance === "high" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#1d1d1f]">{mc.title}</h3>
              <Badge variant={mc.importance === "high" ? "danger" : "warning"} size="md">
                {mc.importance === "high" ? "필수" : "권장"}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-[#6e6e73]">{mc.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
