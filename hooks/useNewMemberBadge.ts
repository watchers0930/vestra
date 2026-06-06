"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "vestra-admin-users-last-seen";
const POLL_INTERVAL = 60_000; // 60초

export function useNewMemberBadge(isAdmin: boolean) {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (!lastSeen) {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      setCount(0);
      return;
    }

    try {
      const res = await fetch(`/api/admin/new-members?since=${encodeURIComponent(lastSeen)}`);
      if (res.ok) {
        const data = await res.json();
        setCount(data.count ?? 0);
      }
    } catch {
      // 네트워크 오류 시 무시
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setCount(0);
      return;
    }

    fetchCount();
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAdmin, fetchCount]);

  const markSeen = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setCount(0);
  }, []);

  return { count, markSeen };
}
