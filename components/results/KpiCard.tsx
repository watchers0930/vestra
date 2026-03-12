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
    <div className="rounded-2xl bg-[#f5f5f7] p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#86868b]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[#1d1d1f]">{value}</p>
          <p className="mt-1 text-xs text-[#86868b]">{description}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
