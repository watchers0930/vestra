import Link from "next/link";

export function HeroSearchInput() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
      <Link
        href="/jeonse/analysis"
        className="inline-flex items-center gap-2 px-10 py-4 rounded bg-[#00042a] text-white font-extrabold text-[11px] tracking-widest uppercase hover:bg-[#1a2060] transition-colors"
      >
        🛡️ 전세 위험도 분석
      </Link>
      <Link
        href="/rights"
        className="inline-flex items-center gap-2 px-10 py-4 rounded border border-[#00042a] text-[#00042a] font-bold text-[11px] tracking-widest uppercase hover:bg-[#00042a] hover:text-white transition-colors"
      >
        📋 등기부 권리분석
      </Link>
    </div>
  );
}
