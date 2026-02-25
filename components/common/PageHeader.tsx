import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PageHeader({ icon: Icon, title, description }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Icon className="text-primary" size={28} />
        {title}
      </h1>
      <p className="text-secondary mt-1">{description}</p>
    </div>
  );
}
