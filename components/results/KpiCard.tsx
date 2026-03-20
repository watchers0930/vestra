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
    <div className="rounded-xl bg-white border border-gray-100 p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[#1d1d1f]">{value}</p>
          <p className="mt-1 text-xs text-[#86868b]">{description}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
