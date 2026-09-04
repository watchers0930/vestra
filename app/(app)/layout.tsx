import { Suspense } from "react";
import Sidebar from "@/components/layout/sidebar";
import Footer from "@/components/layout/footer";
import OnboardingModal from "@/components/common/OnboardingModal";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import SessionGuard from "@/components/auth/session-guard";
import { auth } from "@/lib/auth";
import RealtorGnb from "@/app/(biz)/_shared/RealtorGnb";
import RealtorFooter from "@/app/(biz)/_shared/RealtorFooter";

const SKIP_LINK =
  "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-medium focus:shadow-lg";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 부동산 중개사(REALESTATE)는 사이드바 대신 renewal 톤 상단 nav로 통일한다.
  const session = await auth();
  const isRealtor = session?.user?.role === "REALESTATE";

  if (isRealtor) {
    return (
      <SessionGuard>
        <a href="#main-content" className={SKIP_LINK}>본문으로 건너뛰기</a>
        <RealtorGnb />
        <main
          id="main-content"
          className="mx-auto min-h-[calc(100vh-80px)] max-w-[1200px] px-4 lg:px-8"
          style={{ paddingTop: 24, paddingBottom: 48 }}
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <RealtorFooter />
      </SessionGuard>
    );
  }

  return (
    <SessionGuard>
      <a href="#main-content" className={SKIP_LINK}>본문으로 건너뛰기</a>
      <Suspense><Sidebar /></Suspense>
      <OnboardingModal />
      <div className="min-h-screen lg:ml-[272px] transition-all duration-300">
        <main id="main-content" className="mobile-safe-top px-4 pb-4 lg:px-6 lg:pb-6" style={{ paddingTop: 20 }}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </SessionGuard>
  );
}
