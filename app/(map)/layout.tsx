import { Suspense } from "react";
import Sidebar from "@/components/layout/sidebar";

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense><Sidebar /></Suspense>
      <div className="lg:ml-[240px] h-screen overflow-hidden">
        {children}
      </div>
    </>
  );
}
