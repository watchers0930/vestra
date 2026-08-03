"use client";

import { useEffect, useRef } from "react";
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

export default function SessionGuard() {
  const { status } = useSession();
  const lastActivityRef = useRef<number>(0);

  useEffect(() => {
    if (status !== "authenticated") return;

    // 탭 닫힘 감지: sessionStorage 플래그가 없으면 탭이 닫혔다가 재열림
    const isTabAlive = sessionStorage.getItem("vestra_alive") === "1";
    if (!isTabAlive && !isAnotherTabAlive()) {
      signOut({ redirectTo: "/login" });
      return;
    }

    sessionStorage.setItem("vestra_alive", "1");
    updateHeartbeat();
    lastActivityRef.current = Date.now();

    const updateActivity = () => { lastActivityRef.current = Date.now(); };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    // 1시간 무활동 → 로그아웃
    const inactivityTimer = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) {
        signOut({ redirectTo: "/login" });
      }
    }, CHECK_INTERVAL_MS);

    // 다른 탭에 "이 탭 살아있음" 신호
    const heartbeatTimer = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, updateActivity));
      clearInterval(inactivityTimer);
      clearInterval(heartbeatTimer);
    };
  }, [status]);

  return null;
}
