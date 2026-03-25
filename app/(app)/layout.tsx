import { Suspense } from "react";
import Sidebar from "@/components/layout/sidebar";
import Footer from "@/components/layout/footer";
import OnboardingModal from "@/components/common/OnboardingModal";
import ErrorBoundary from "@/components/common/ErrorBoundary";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-medium focus:shadow-lg"
      >
        본문으로 건너뛰기
      </a>
      <Suspense><Sidebar /></Suspense>
      <OnboardingModal />
      <div className="min-h-screen lg:ml-[240px] transition-all duration-300">
        <main id="main-content" className="p-4 pt-16 lg:pt-6 lg:p-6 max-w-6xl">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </>
  );
}
