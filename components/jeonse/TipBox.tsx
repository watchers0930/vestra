import { Lightbulb, AlertTriangle, AlertOctagon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const variants: Record<string, { border: string; bg: string; icon: LucideIcon; iconColor: string }> = {
  tip:       { border: "border-emerald-400", bg: "bg-emerald-50", icon: Lightbulb,     iconColor: "text-emerald-600" },
  warning:   { border: "border-amber-400",   bg: "bg-amber-50",   icon: AlertTriangle, iconColor: "text-amber-600" },
  important: { border: "border-red-400",      bg: "bg-red-50",     icon: AlertOctagon,  iconColor: "text-red-600" },
};

export default function TipBox({ variant, title, children }: { variant: "tip" | "warning" | "important"; title: string; children: React.ReactNode }) {
  const v = variants[variant];
  const Icon = v.icon;
  return (
    <div className={cn("border-l-4 rounded-r-lg p-4", v.border, v.bg)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className={v.iconColor} />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="text-sm text-secondary leading-relaxed">{children}</div>
    </div>
  );
}
