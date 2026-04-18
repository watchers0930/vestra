"use client";

export function VerifyStep() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm py-16 text-center">
      <div className="relative w-12 h-12 mx-auto mb-5">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-base font-semibold text-[#1d1d1f]">사업성 검증 분석 중...</p>
      <p className="text-sm text-[#6e6e73] mt-1.5">공공데이터 교차 검증 및 AI 의견 생성 중입니다</p>
      <div className="flex items-center justify-center gap-1.5 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
