"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { isPublicPath } from "@/lib/public-paths";

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
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const lastActivityRef = useRef<number>(0);

  // 세션 만료·강제 로그아웃 후 목적지: 관리자는 구 /login(이메일·비번), 그 외는 renewal 로그인 모달.
  const role = session?.user?.role;

  useEffect(() => {
    if (status === "loading") return;

    // 관리자만 구 /login(이메일·비번), 그 외는 renewal 홈의 로그인 모달로 유도
    const signOutDest = role === "ADMIN" ? "/login" : "/home?auth=login";

    if (status === "authenticated") {
      // 공개 페이지(매물·분석 체험)는 단일탭 강제 로그아웃 예외 —
      // 새 탭으로 둘러보기만 하는 경우까지 로그인 세션을 끊지 않는다.
      // 사업자 홈(로그인 직후 목적지)도 예외 — 로그인 직후엔 vestra_alive가 아직 없어
      //   개인 /home(공개 경로)과 달리 강제 로그아웃되던 문제(중개사·임대사업자·기업 로그인 실패) 방지.
      //   임대사업자는 중개사와 동일 UI(/realtor)를 공용한다.
      const isBizHome = pathname === "/realtor" || pathname === "/dashboard";
      const isPublic = isPublicPath(pathname) || isBizHome;
      const isTabAlive = sessionStorage.getItem("vestra_alive") === "1";
      if (!isPublic && !isTabAlive && !isAnotherTabAlive()) {
        signOut({ redirectTo: signOutDest });
        return; // checked 유지 → 오버레이 유지 → 리다이렉트 완료까지 콘텐츠 노출 없음
      }

      sessionStorage.setItem("vestra_alive", "1");
      updateHeartbeat();
      lastActivityRef.current = Date.now();
      startTransition(() => setChecked(true)); // 검증 통과 → 오버레이 제거

      const updateActivity = () => { lastActivityRef.current = Date.now(); };
      ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

      const inactivityTimer = setInterval(() => {
        if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) {
          signOut({ redirectTo: signOutDest });
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
    startTransition(() => setChecked(true));
  }, [status, pathname, role]);

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
