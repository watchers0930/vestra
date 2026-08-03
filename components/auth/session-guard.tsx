"use client";

import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

const INACTIVITY_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 20 * 1000;
const HEARTBEAT_STALE_MS = 35 * 1000;

const ACTIVITY_EVENTS = [
  "mousemove", "keydown", "click", "scroll", "touchstart", "pointerdown",
] as const;

function isAnotherTabAlive(): boolean {
  try {
    const raw = localStorage.getItem("vestra_heartbeat");
    return !!raw && Date.now() - Number(raw) < HEARTBEAT_STALE_MS;
  } catch { return false; }
}

function updateHeartbeat() {
  try { localStorage.setItem("vestra_heartbeat", String(Date.now())); } catch {}
}

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [checked, setChecked] = useState(false);
  const lastActivityRef = useRef<number>(0);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      const isTabAlive = sessionStorage.getItem("vestra_alive") === "1";
      if (!isTabAlive && !isAnotherTabAlive()) {
        signOut({ redirectTo: "/login" });
        return; // checked 유지 → 오버레이 유지 → 리다이렉트 완료까지 콘텐츠 노출 없음
      }

      sessionStorage.setItem("vestra_alive", "1");
      updateHeartbeat();
      lastActivityRef.current = Date.now();
      setChecked(true); // 검증 통과 → 오버레이 제거

      const updateActivity = () => { lastActivityRef.current = Date.now(); };
      ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

      const inactivityTimer = setInterval(() => {
        if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) {
          signOut({ redirectTo: "/login" });
        }
      }, CHECK_INTERVAL_MS);

      const heartbeatTimer = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL_MS);

      return () => {
        ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, updateActivity));
        clearInterval(inactivityTimer);
        clearInterval(heartbeatTimer);
      };
    }

    // 비로그인 상태 → 오버레이 제거 (미들웨어가 보호)
    setChecked(true);
  }, [status]);

  return (
    <>
      {children}
      {!checked && (
        <div
          aria-hidden
          style={{ position: "fixed", inset: 0, background: "#f5f5f7", zIndex: 9999 }}
        />
      )}
    </>
  );
}
