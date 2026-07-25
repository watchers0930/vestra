import Link from "next/link";

export function HeroSearchInput() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
      <Link
        href="/jeonse/analysis"
        className="inline-flex items-center gap-2 h-13 px-7 rounded-xl bg-[#00042a] text-white text-[14px] font-bold shadow-lg hover:bg-[#1a2060] transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
      >
        <span className="text-base">🛡️</span>
        전세 위험도 분석 시작하기
      </Link>
      <Link
        href="/rights"
        className="inline-flex items-center gap-2 h-13 px-7 rounded-xl border-2 border-[#00042a] text-[#00042a] text-[14px] font-bold hover:bg-[#00042a] hover:text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        <span className="text-base">📋</span>
        등기부 권리분석 하기
      </Link>
    </div>
  );
}
