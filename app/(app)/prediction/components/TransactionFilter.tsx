"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/common";

interface Props {
  availableApts: string[];
  availableAreas: number[];
  selectedApt: string | null;
  setSelectedApt: (apt: string | null) => void;
  selectedArea: number | null;
  setSelectedArea: (area: number | null) => void;
}

export function TransactionFilter({
  availableApts, availableAreas,
  selectedApt, setSelectedApt,
  selectedArea, setSelectedArea,
}: Props) {
  if (availableApts.length === 0 && availableAreas.length === 0) return null;

  return (
    <Card className="p-4 space-y-3">
      {availableApts.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-secondary whitespace-nowrap">아파트</span>
          <select
            value={selectedApt ?? ""}
            onChange={(e) => { setSelectedApt(e.target.value || null); setSelectedArea(null); }}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-xs"
          >
            <option value="">전체 ({availableApts.length}개 단지)</option>
            {availableApts.map((apt) => <option key={apt} value={apt}>{apt}</option>)}
          </select>
        </div>
      )}
      {availableAreas.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-secondary whitespace-nowrap">전용면적</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedArea(null)}
              className={cn("px-3 py-1 text-xs rounded-full border transition-all",
                selectedArea === null
                  ? "bg-[#1d1d1f] text-white border-[#1d1d1f]"
                  : "bg-white text-secondary border-border hover:bg-[#f5f5f7]"
              )}
            >
              전체평수
            </button>
            {availableAreas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={cn("px-3 py-1 text-xs rounded-full border transition-all",
                  selectedArea === area
                    ? "bg-[#1d1d1f] text-white border-[#1d1d1f]"
                    : "bg-white text-secondary border-border hover:bg-[#f5f5f7]"
                )}
              >
                {area}㎡
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
