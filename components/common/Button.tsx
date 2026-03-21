import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "amber";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary/90 border-transparent",
  secondary:
    "bg-white text-[#1d1d1f] border-[#e5e5e7] hover:bg-[#f5f5f7]",
  danger:
    "bg-red-500 text-white hover:bg-red-600 border-transparent",
  ghost:
    "bg-transparent text-[#424245] hover:bg-[#f5f5f7] border-transparent",
  amber:
    "bg-amber-500 text-white hover:bg-amber-600 border-transparent",
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-sm",
};

export function Button({
  variant = "primary",
  icon: Icon,
  loading = false,
  fullWidth = false,
  size = "md",
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-xl font-medium border transition-colors flex items-center justify-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-disabled={disabled || loading || undefined}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === "sm" ? 14 : 18} className="animate-spin" />
      ) : Icon ? (
        <Icon size={size === "sm" ? 14 : 18} strokeWidth={1.5} />
      ) : null}
      {children}
    </button>
  );
}
