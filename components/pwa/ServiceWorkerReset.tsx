"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "vestra-sw-reset-v1";

export default function ServiceWorkerReset() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      if (!registrations.length) return;

      await Promise.all(registrations.map((registration) => registration.unregister()));

      if (window.sessionStorage.getItem(RELOAD_FLAG) === "1") return;
      window.sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
    }).catch(() => {
      // Ignore unregister failures and leave the page usable.
    });
  }, []);

  return null;
}
