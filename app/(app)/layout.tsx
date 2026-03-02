import { Suspense } from "react";
import Sidebar from "@/components/layout/sidebar";
import Footer from "@/components/layout/footer";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense><Sidebar /></Suspense>
      <div className="min-h-screen lg:ml-[240px] transition-all duration-300">
        <main className="p-4 pt-16 lg:pt-6 lg:p-6">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
