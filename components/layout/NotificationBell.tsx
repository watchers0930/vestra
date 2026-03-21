"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  message: string;
  date: string;
  read: boolean;
}

const STORAGE_KEY = "vestra_notifications";

function getNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(items: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function NotificationBell({ collapsed }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifications(getNotifications());
  }, []);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  }, [notifications]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative flex items-center justify-center rounded-lg transition-colors duration-200",
          "text-gray-400 hover:bg-white/[0.04] hover:text-gray-100",
          collapsed ? "w-10 h-10" : "w-8 h-8"
        )}
        aria-label="알림"
        title="알림"
      >
        <Bell size={18} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-[70] mt-2 rounded-xl border border-[#e5e5e7] bg-white shadow-lg",
            "w-[320px] max-h-80 overflow-hidden flex flex-col",
            collapsed ? "left-full ml-2 top-0" : "left-0"
          )}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e7]">
            <h3 className="text-sm font-semibold text-[#1d1d1f]">알림</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline"
              >
                모두 읽음 처리
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Bell size={28} strokeWidth={1.5} className="text-[#e5e5e7] mb-2" />
                <p className="text-sm text-[#6e6e73]">새로운 알림이 없습니다</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-4 py-3 border-b border-[#f5f5f7] last:border-0 transition-colors",
                    !n.read && "bg-primary/[0.03]"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-red-500" />
                    )}
                    <div className={cn(!n.read ? "" : "pl-4")}>
                      <p className="text-sm text-[#1d1d1f] leading-snug">{n.message}</p>
                      <p className="text-[10px] text-[#6e6e73] mt-1">{formatDate(n.date)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
