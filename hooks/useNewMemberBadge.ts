"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "vestra-admin-users-last-seen";
const POLL_INTERVAL = 60_000; // 60초

export function useNewMemberBadge(isAdmin: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    const poll = async () => {
      const lastSeen = localStorage.getItem(STORAGE_KEY);
      if (!lastSeen) {
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
        return;
      }
      try {
        const res = await fetch(`/api/admin/new-members?since=${encodeURIComponent(lastSeen)}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setCount(data.count ?? 0);
        }
      } catch {
        // 네트워크 오류 시 무시
      }
    };

    const timeoutId = setTimeout(poll, 0);
    const intervalId = setInterval(poll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [isAdmin]);

  const markSeen = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setCount(0);
  }, []);

  return { count, markSeen };
}
