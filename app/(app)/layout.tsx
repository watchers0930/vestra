import { Suspense } from "react";
import Sidebar from "@/components/layout/sidebar";
import Footer from "@/components/layout/footer";
import OnboardingModal from "@/components/common/OnboardingModal";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense><Sidebar /></Suspense>
      <OnboardingModal />
      <div className="min-h-screen lg:ml-[240px] transition-all duration-300">
        <main id="app-main" className="p-4 pt-16 lg:pt-6 lg:p-6 max-w-6xl">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
