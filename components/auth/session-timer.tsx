"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Timer } from "lucide-react";

const INACTIVITY_MS = 60 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousemove", "keydown", "click", "scroll", "touchstart", "pointerdown",
] as const;

export default function SessionTimer() {
  const { status } = useSession();
  const lastActivityRef = useRef<number>(0);
  const [remaining, setRemaining] = useState(INACTIVITY_MS);

  useEffect(() => {
    if (status !== "authenticated") return;

    lastActivityRef.current = Date.now();

    const updateActivity = () => { lastActivityRef.current = Date.now(); };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    const tick = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      setRemaining(Math.max(0, INACTIVITY_MS - elapsed));
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, updateActivity));
      clearInterval(tick);
    };
  }, [status]);

  if (status !== "authenticated") return null;

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isCritical = minutes < 2;
  const isLow = minutes < 5;

  return (
    <div
      className={`flex items-center gap-[5px] rounded-full border px-[14px] py-[5px] text-[11px] font-medium tabular-nums transition-colors ${
        isCritical
          ? "border-red-200 bg-red-50 text-red-500"
          : isLow
          ? "border-amber-200 bg-amber-50 text-amber-500"
          : "border-black/[0.07] bg-white/60 text-[#8e8e93]"
      }`}
      title="자동 로그아웃까지 남은 시간"
    >
      <Timer size={11} strokeWidth={1.5} />
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
