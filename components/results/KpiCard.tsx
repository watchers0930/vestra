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
  iconBg = "bg-blue-50",
  iconColor = "text-primary",
}: KpiCardProps) {
  return (
    <div className="card-hover rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}
