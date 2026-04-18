"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Button } from "@/components/common";

interface Props {
  roadResult: string;
  loading: boolean;
  canSearch: boolean;
  openDaumPostcode: () => void;
  handleAnalyze: () => Promise<void>;
}

export function AddressSearchCard({ roadResult, loading, canSearch, openDaumPostcode, handleAnalyze }: Props) {
  return (
    <Card className="p-4 sm:p-6 mb-6" role="search" aria-label="주소 검색">
      <p className="text-xs text-[#6e6e73] mb-3 sm:mb-4 sm:text-center">주소를 검색하여 선택하세요.</p>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div
          onClick={openDaumPostcode}
          role="button"
          aria-label={roadResult ? `선택된 주소: ${roadResult}. 클릭하여 변경` : "클릭하여 주소 검색"}
          className={cn(
            "flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border text-sm cursor-pointer transition-colors",
            roadResult
              ? "border-border bg-white text-[#1d1d1f]"
              : "border-dashed border-[#e5e5e7] bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#e5e5e7]"
          )}
        >
          {roadResult || "클릭하여 주소 검색"}
        </div>
        {roadResult ? (
          <Button icon={Search} loading={loading} disabled={!canSearch} size="lg" onClick={handleAnalyze}>분석</Button>
        ) : (
          <Button icon={Search} size="lg" onClick={openDaumPostcode}>주소 검색</Button>
        )}
      </div>
    </Card>
  );
}
