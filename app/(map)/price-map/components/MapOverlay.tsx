"use client";

interface Props {
  loading: boolean;
  total: number;
}

const LEGEND_ITEMS = [
  { color: "bg-[#1e3a5f]", label: "60평+" },
  { color: "bg-[#1e40af]", label: "50평대" },
  { color: "bg-[#2563eb]", label: "40평대" },
  { color: "bg-[#3b82f6]", label: "30평대" },
  { color: "bg-[#93c5fd]", label: "20평대 이하" },
];

export function MapOverlay({ loading, total }: Props) {
  return (
    <>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/80">
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <span className="text-sm text-gray-600">시세 데이터 로딩 중...</span>
          </div>
        </div>
      )}

      {/* 범례 */}
      <div className="absolute bottom-4 right-4 z-10 rounded-lg border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
        <p className="mb-1 text-[10px] font-semibold text-gray-700">평형대 범례</p>
        <div className="space-y-0.5">
          {LEGEND_ITEMS.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
              <span className="text-[10px] text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 총 건수 */}
      <div className="absolute left-3 top-3 z-10 rounded-lg bg-white/95 px-2.5 py-1 shadow backdrop-blur-sm">
        <span className="text-xs text-gray-600">
          <span className="font-bold text-indigo-600">{total}</span>개 아파트
        </span>
      </div>
    </>
  );
}
