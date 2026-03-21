import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "card" | "chart" | "circle";
}

const variantStyles: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  text: "h-4 w-full rounded bg-[#f5f5f7] animate-pulse",
  card: "h-32 w-full rounded-xl bg-[#f5f5f7] animate-pulse",
  chart: "h-48 w-full rounded-xl bg-[#f5f5f7] animate-pulse",
  circle: "h-10 w-10 rounded-full bg-[#f5f5f7] animate-pulse",
};

export function Skeleton({ className, variant = "text" }: SkeletonProps) {
  return <div className={cn(variantStyles[variant], className)} />;
}
