import type { LucideIcon } from "lucide-react";
import { CategoryHero } from "@/components/common/CategoryHero";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";

export default function ProcedurePageLayout({
  title,
  description,
  icon: Icon,
  breadcrumbLabel,
  children,
  sidebar,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  breadcrumbLabel: string;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}) {
  return (
    <div style={{ paddingBottom: "48px", paddingTop: "52px" }}>
      <DashboardPageTopbar current={breadcrumbLabel} primaryHref="/jeonse" primaryLabel="전세보호" />
      <CategoryHero
        badge={
          <>
            <Icon size={11} strokeWidth={2} />
            {breadcrumbLabel}
          </>
        }
        title={title}
        description={description}
      />

      {sidebar ? (
        <div className="flex flex-col lg:flex-row items-start gap-5">
          <div className="flex flex-col gap-5 min-w-0 flex-1 lg:sticky lg:top-5">{children}</div>
          <div className="flex flex-col gap-5 w-full lg:w-[360px] lg:sticky lg:top-5">{sidebar}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">{children}</div>
      )}
    </div>
  );
}
