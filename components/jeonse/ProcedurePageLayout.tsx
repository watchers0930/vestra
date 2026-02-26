import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/common";

export default function ProcedurePageLayout({
  title,
  description,
  icon,
  breadcrumbLabel,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  breadcrumbLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <nav className="flex items-center gap-1 text-sm mb-4">
        <Link href="/jeonse" className="text-primary hover:underline">전세보호</Link>
        <ChevronRight size={14} className="text-muted" />
        <span className="font-medium">{breadcrumbLabel}</span>
      </nav>
      <PageHeader icon={icon} title={title} description={description} />
      <div className="space-y-6">{children}</div>
    </div>
  );
}
