import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PageHeader({ icon: Icon, title, description }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-xl font-semibold flex items-center gap-3 text-[#1d1d1f]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f5f7]">
          <Icon className="h-[18px] w-[18px] text-[#1d1d1f]" strokeWidth={1.5} />
        </div>
        {title}
      </h1>
      <p className="text-sm text-[#86868b] mt-1 ml-12">{description}</p>
    </div>
  );
}
