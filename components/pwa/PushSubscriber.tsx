"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";

export default function PushSubscriber() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setIsSupported(supported);

    if (supported) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  if (!isSupported) return null;

  const handleToggle = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (isSubscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setIsSubscribed(false);
      } else {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        if (!vapidKey) {
          console.warn("VAPID key not configured");
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error("Push subscription error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
      title={isSubscribed ? "알림 해제" : "알림 받기"}
    >
      {isSubscribed ? (
        <Bell className="h-4 w-4 text-indigo-600" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {loading ? "처리 중..." : isSubscribed ? "알림 켜짐" : "알림 받기"}
      </span>
    </button>
  );
}
