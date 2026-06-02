self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Push 알림 수신 ───
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {
    title: "VESTRA",
    body: "새로운 알림이 있습니다.",
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

// ─── 알림 클릭 시 해당 URL로 이동 ───
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // 이미 열린 탭이 있으면 포커스
        for (const client of clients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        // 없으면 새 창 열기
        return self.clients.openWindow(url);
      })
  );
});
