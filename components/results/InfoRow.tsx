import { cn } from "@/lib/utils";

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

export function InfoRow({ label, value, className, valueClassName }: InfoRowProps) {
  return (
    <div className={cn("flex justify-between text-sm py-2", className)}>
      <span className="text-secondary">{label}</span>
      <span className={cn("font-semibold", valueClassName)}>{value}</span>
    </div>
  );
}
