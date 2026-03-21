import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
}

export function KpiCard({
  label,
  value,
  description,
  icon: Icon,
  iconBg = "bg-[#f5f5f7]",
  iconColor = "text-[#1d1d1f]",
}: KpiCardProps) {
  return (
    <div className="rounded-xl bg-white border border-[#e5e5e7] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-[28px] font-bold text-[#1d1d1f] leading-tight">{value}</p>
          <p className="mt-1.5 text-xs text-[#6e6e73]">{description}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
