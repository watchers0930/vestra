"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    const fullPath = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    const pageTitle = document.title;
    const pageLocation = window.location.href;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "vestra_page_view",
      page_path: fullPath,
      page_title: pageTitle,
    });

    window.gtag?.("event", "page_view", {
      page_path: fullPath,
      page_title: pageTitle,
      page_location: pageLocation,
    });
  }, [pathname, searchParams]);

  return null;
}
