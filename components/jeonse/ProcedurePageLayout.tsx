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
        <>
          <style>{`@media (min-width: 1024px) { .procedure-grid { display: grid !important; grid-template-columns: 1fr 360px !important; } }`}</style>
          <div className="procedure-grid" style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>{children}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>{sidebar}</div>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>{children}</div>
      )}
    </div>
  );
}
