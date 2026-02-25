import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type BadgeVariant = "danger" | "warning" | "success" | "info" | "neutral" | "primary";

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}

const variantStyles: Record<BadgeVariant, string> = {
  danger: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  info: "bg-blue-50 text-blue-600 border-blue-200",
  neutral: "bg-gray-50 text-gray-600 border-gray-200",
  primary: "bg-primary text-white border-primary",
};

export function Badge({
  variant = "neutral",
  icon: Icon,
  children,
  className,
  size = "sm",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
        variantStyles[variant],
        className
      )}
    >
      {Icon && <Icon size={size === "sm" ? 10 : 12} />}
      {children}
    </span>
  );
}

// 위험도 뱃지 (자주 쓰이는 패턴)
type RiskLevel = "high" | "medium" | "low";

const riskVariant: Record<RiskLevel, BadgeVariant> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

const riskLabel: Record<RiskLevel, string> = {
  high: "고위험",
  medium: "중간",
  low: "저위험",
};

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  return (
    <Badge variant={riskVariant[level]} size="md" className={className}>
      {riskLabel[level]}
    </Badge>
  );
}
