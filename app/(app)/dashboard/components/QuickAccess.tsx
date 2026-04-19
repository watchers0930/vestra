import Link from "next/link";
import { Scale, FileText, TrendingUp, Home, Bot, Calculator } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ITEMS: { href: string; Icon: LucideIcon; label: string; bg: string; color: string }[] = [
  { href: "/rights",     Icon: Scale,       label: "권리분석",     bg: "rgba(0,113,227,0.09)",   color: "#0071e3" },
  { href: "/contract",   Icon: FileText,    label: "계약검토",     bg: "rgba(48,209,88,0.09)",   color: "#30d158" },
  { href: "/prediction", Icon: TrendingUp,  label: "시세전망",     bg: "rgba(255,159,10,0.09)",  color: "#ff9f0a" },
  { href: "/jeonse",     Icon: Home,        label: "전세보호",     bg: "rgba(255,59,48,0.07)",   color: "#ff3b30" },
  { href: "/assistant",  Icon: Bot,         label: "AI 어시스턴트", bg: "rgba(100,200,255,0.09)", color: "#0a84ff" },
  { href: "/tax",        Icon: Calculator,  label: "세금계산",     bg: "rgba(130,80,255,0.07)",  color: "#8250ff" },
];

export function QuickAccess() {
  return (
    <div className="grid grid-cols-3 gap-[12px] sm:grid-cols-6">
      {ITEMS.map(({ href, Icon, label, bg, color }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-[9px] rounded-[15px] bg-white px-[12px] py-[18px] transition-all duration-200 hover:-translate-y-[2px]"
          style={{
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.boxShadow = "0 8px 32px rgba(0,0,0,0.10)";
            el.style.borderColor = "rgba(0,113,227,0.20)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
            el.style.borderColor = "rgba(0,0,0,0.08)";
          }}
        >
          <div
            className="flex h-[42px] w-[42px] items-center justify-center rounded-[13px]"
            style={{ background: bg }}
          >
            <Icon size={20} strokeWidth={1.7} style={{ color }} />
          </div>
          <span className="text-center text-[11.5px] font-semibold text-[#1d1d1f]">{label}</span>
        </Link>
      ))}
    </div>
  );
}
