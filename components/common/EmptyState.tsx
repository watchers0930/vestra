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
        "rounded-xl border border-border bg-card p-12 text-center shadow-sm",
        className
      )}
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted max-w-md mx-auto">{description}</p>
      {actions && actions.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {actions.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                action.variant === "secondary"
                  ? "border border-border text-secondary hover:bg-gray-50"
                  : "bg-primary text-white hover:bg-primary-dark"
              )}
            >
              {action.icon && <action.icon size={16} />}
              {action.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
