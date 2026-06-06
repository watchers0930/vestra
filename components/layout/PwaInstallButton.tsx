"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";

export default function PwaInstallButton({ collapsed }: { collapsed: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || !deferredPrompt) return null;

  const handleInstall = async () => {
    const prompt = deferredPrompt as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") { setInstalled(true); setDeferredPrompt(null); }
  };

  return (
    <button onClick={handleInstall} style={{ margin: "0 10px 8px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "12px", border: "1px solid rgba(0,113,227,0.25)", background: "rgba(0,113,227,0.08)", padding: "8px 12px", fontSize: "12px", fontWeight: 500, color: "#2997ff", cursor: "pointer", transition: "all 0.15s" }}>
      <Download size={14} />
      {!collapsed && <span>앱 설치하기</span>}
    </button>
  );
}
