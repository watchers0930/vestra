import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[#f5f5f7] border border-[#d2d2d7]/50",
        hover && "transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, description, children, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-5", className)}>
      <div>
        <h2 className="text-lg font-semibold text-[#1d1d1f]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-[#86868b]">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("p-6", className)}>{children}</div>;
}
