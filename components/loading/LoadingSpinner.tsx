import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** full: 카드 전체 로딩, inline: 인라인 스피너 */
  variant?: "full" | "inline";
}

const sizeMap = { sm: 18, md: 28, lg: 40 };

export function LoadingSpinner({
  message,
  size = "lg",
  className,
  variant = "full",
}: LoadingSpinnerProps) {
  if (variant === "inline") {
    return <Loader2 size={sizeMap[size]} className={cn("animate-spin text-primary", className)} />;
  }

  return (
    <div className={cn("bg-card rounded-xl border border-border p-12 text-center", className)}>
      <Loader2 size={sizeMap[size]} className="animate-spin text-primary mx-auto mb-4" />
      {message && <p className="text-secondary">{message}</p>}
    </div>
  );
}
