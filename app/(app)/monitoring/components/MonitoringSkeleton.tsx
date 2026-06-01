"use client";

import { Skeleton } from "@/components/common/Skeleton";

export function MonitoringSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI 스켈레톤 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>

      {/* 카드 그리드 스켈레톤 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    </div>
  );
}
