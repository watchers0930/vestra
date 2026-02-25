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
        "rounded-xl border border-border bg-card shadow-sm",
        hover && "card-hover",
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
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted">{description}</p>
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
