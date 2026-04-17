"use client";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-24 bg-[#f5f5f7] rounded animate-pulse" />
          <div className="h-4 w-48 bg-[#f5f5f7] rounded animate-pulse mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-5">
            <div className="h-4 w-20 bg-[#f5f5f7] rounded animate-pulse mb-3" />
            <div className="h-7 w-28 bg-[#f5f5f7] rounded animate-pulse mb-1" />
            <div className="h-3 w-16 bg-[#f5f5f7] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 bg-[#f5f5f7] rounded-lg animate-pulse" />
          <div className="h-4 w-32 bg-[#f5f5f7] rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[220px] bg-[#f5f5f7] rounded-lg animate-pulse" />
          <div className="h-[220px] bg-[#f5f5f7] rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
