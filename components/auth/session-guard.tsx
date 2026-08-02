"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

const INACTIVITY_MS = 60 * 60 * 1000; // 1시간
const CHECK_INTERVAL_MS = 60 * 1000;  // 1분마다 체크

const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
  "pointerdown",
] as const;

export default function SessionGuard() {
  const { status } = useSession();
  const lastActivityRef = useRef<number>(0);

  useEffect(() => {
    if (status !== "authenticated") return;

    lastActivityRef.current = Date.now();

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    const timer = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) {
        signOut({ redirectTo: "/login" });
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(timer);
    };
  }, [status]);

  return null;
}
