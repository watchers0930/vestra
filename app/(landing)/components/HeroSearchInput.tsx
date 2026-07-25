import Link from "next/link";

export function HeroSearchInput() {
  return (
    <div className="flex flex-row flex-wrap items-center gap-3 mt-2">
      <Link
        href="/jeonse/analysis"
        className="inline-flex items-center gap-2 w-fit px-7 py-3.5 rounded bg-[#00042a] text-white font-bold text-[15px] hover:bg-[#1a2060] transition-colors"
      >
        <span>🛡️</span>
        전세 위험도 분석
      </Link>
      <Link
        href="/rights"
        className="inline-flex items-center gap-2 w-fit px-7 py-3.5 rounded border-2 border-[#00042a] text-[#00042a] font-bold text-[15px] hover:bg-[#00042a] hover:text-white transition-colors"
      >
        <span>📋</span>
        등기부 권리분석
      </Link>
    </div>
  );
}
