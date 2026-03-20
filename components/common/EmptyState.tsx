import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateAction {
  href: string;
  label: string;
  icon?: LucideIcon;
  variant?: "primary" | "secondary";
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white border border-gray-100 py-16 px-8 text-center",
        className
      )}
    >
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50">
        <Icon className="h-9 w-9 text-[#86868b]" strokeWidth={1.2} />
      </div>
      <h3 className="text-base font-semibold text-[#1d1d1f]">{title}</h3>
      <p className="mt-2 text-sm text-[#86868b] max-w-md mx-auto leading-relaxed">{description}</p>
      {actions && actions.length > 0 && (
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {actions.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
                action.variant === "secondary"
                  ? "border border-gray-200 text-[#424245] hover:border-primary/40 hover:text-primary hover:bg-primary/5"
                  : "border border-primary text-primary hover:bg-primary hover:text-white"
              )}
            >
              {action.icon && <action.icon size={15} strokeWidth={1.5} />}
              {action.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
