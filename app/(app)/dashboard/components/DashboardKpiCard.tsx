import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  colorAccent: "blue" | "green" | "orange" | "red";
  trend?: string;
  trendDir?: "up" | "down" | "flat";
}

const ACCENT: Record<string, string> = {
  blue:   "linear-gradient(90deg, #0071e3, #2997ff)",
  green:  "linear-gradient(90deg, #30d158, #70e896)",
  orange: "linear-gradient(90deg, #ff9f0a, #ffd60a)",
  red:    "linear-gradient(90deg, #ff3b30, #ff7b73)",
};

const ICON_BG: Record<string, string> = {
  blue:   "rgba(0,113,227,0.09)",
  green:  "rgba(48,209,88,0.09)",
  orange: "rgba(255,159,10,0.09)",
  red:    "rgba(255,59,48,0.08)",
};

const TREND_STYLE: Record<string, { color: string; bg: string }> = {
  up:   { color: "#30d158", bg: "rgba(48,209,88,0.09)" },
  down: { color: "#ff3b30", bg: "rgba(255,59,48,0.08)" },
  flat: { color: "#6e6e73", bg: "rgba(0,0,0,0.05)" },
};

const ICON_COLOR: Record<string, string> = {
  blue:   "#0071e3",
  green:  "#30d158",
  orange: "#ff9f0a",
  red:    "#ff3b30",
};

export function DashboardKpiCard({ label, value, description, icon: Icon, colorAccent, trend, trendDir = "flat" }: Props) {
  const ts = TREND_STYLE[trendDir];

  return (
    <div
      className="group relative overflow-hidden rounded-[18px] bg-white p-[22px] transition-all duration-200 hover:-translate-y-[2px]"
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.10)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
      }}
    >
      {/* 상단 컬러 라인 */}
      <div
        className="absolute left-0 right-0 top-0 h-[3px] rounded-t-[18px]"
        style={{ background: ACCENT[colorAccent] }}
      />

      <div className="mt-[3px] flex items-center justify-between mb-[14px]">
        <div
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px]"
          style={{ background: ICON_BG[colorAccent] }}
        >
          <Icon size={18} strokeWidth={1.7} style={{ color: ICON_COLOR[colorAccent] }} />
        </div>

        {trend && (
          <span
            className="rounded-full px-[8px] py-[3px] text-[10.5px] font-semibold"
            style={{ color: ts.color, background: ts.bg }}
          >
            {trend}
          </span>
        )}
      </div>

      <div
        className="mb-[5px] font-bold leading-none tracking-[-0.03em] text-[#1d1d1f]"
        style={{ fontSize: value.length > 6 ? 24 : 30 }}
      >
        {value}
      </div>
      <div className="mb-[2px] text-[13px] font-semibold text-[#1d1d1f]">{label}</div>
      <div className="text-[11.5px] text-[#6e6e73]">{description}</div>
    </div>
  );
}
