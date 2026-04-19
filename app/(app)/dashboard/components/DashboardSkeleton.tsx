"use client";

export function DashboardSkeleton() {
  return (
    <div>
      {/* Topbar skeleton */}
      <div
        className="sticky top-0 z-10 flex h-[52px] items-center justify-between border-b border-black/[0.06] px-9"
        style={{ background: "rgba(245,245,247,0.82)" }}
      >
        <div className="h-4 w-40 animate-pulse rounded bg-[#e5e5e7]" />
        <div className="flex gap-2">
          <div className="h-7 w-24 animate-pulse rounded-full bg-[#e5e5e7]" />
          <div className="h-7 w-20 animate-pulse rounded-full bg-[#e5e5e7]" />
        </div>
      </div>

      <div className="px-9 pb-20">
        {/* Hero skeleton */}
        <div className="mb-7 mt-9 h-[240px] animate-pulse rounded-[32px] bg-[#e5e5e7]" />

        {/* Info banner skeleton */}
        <div className="mb-7 h-[52px] animate-pulse rounded-[13px] bg-[#f0f0f2]" />

        {/* KPI skeleton */}
        <div className="mb-7 grid grid-cols-2 gap-[14px] xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[128px] animate-pulse rounded-[18px] bg-white"
              style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            />
          ))}
        </div>

        {/* Quick Access skeleton */}
        <div className="mb-7 grid grid-cols-3 gap-[12px] sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[90px] animate-pulse rounded-[15px] bg-[#f0f0f2]" />
          ))}
        </div>

        {/* Portfolio skeleton */}
        <div className="mb-7 grid grid-cols-1 gap-[14px] lg:grid-cols-2">
          <div className="h-[200px] animate-pulse rounded-[18px] bg-[#f0f0f2]" />
          <div className="h-[200px] animate-pulse rounded-[18px] bg-[#f0f0f2]" />
        </div>

        {/* Asset table skeleton */}
        <div
          className="mb-7 overflow-hidden rounded-[18px] bg-white"
          style={{ border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="h-[44px] animate-pulse bg-[#f5f5f7]" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mx-[22px] my-[14px] h-[34px] animate-pulse rounded-lg bg-[#f0f0f2]" />
          ))}
        </div>

        {/* History grid skeleton */}
        <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[140px] animate-pulse rounded-[18px] bg-[#f0f0f2]" />
          ))}
        </div>
      </div>
    </div>
  );
}
