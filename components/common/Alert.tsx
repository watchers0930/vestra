import { cn } from "@/lib/utils";
import { AlertTriangle, Info, XCircle } from "lucide-react";

type AlertVariant = "error" | "warning" | "info";

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

const alertStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: typeof Info }> = {
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    icon: XCircle,
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: Info,
  },
};

export function Alert({ variant = "info", children, className }: AlertProps) {
  const style = alertStyles[variant];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex items-start gap-3",
        style.bg,
        style.border,
        className
      )}
    >
      <Icon size={18} className={cn(style.text, "flex-shrink-0 mt-0.5")} />
      <div className={cn("text-sm", style.text)}>{children}</div>
    </div>
  );
}
