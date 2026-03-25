import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
  NetworkOnly,
  ExpirationPlugin,
  RangeRequestsPlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// ─── 오프라인 폴백 ───
const OFFLINE_FALLBACK_URL = "/offline";

// ─── 페이지 캐시 이름 ───
const PAGES_CACHE = {
  rscPrefetch: "pages-rsc-prefetch",
  rsc: "pages-rsc",
  html: "pages",
};

// ─── 런타임 캐싱 전략 ───
const runtimeCaching = process.env.NODE_ENV !== "production"
  ? [{ matcher: /.*/i, handler: new NetworkOnly() }]
  : [
      // ── 정적 자산: CacheFirst ──

      // Google Fonts (웹폰트 파일)
      {
        matcher: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
        handler: new CacheFirst({
          cacheName: "google-fonts-webfonts",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 8,
              maxAgeSeconds: 365 * 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
          ],
        }),
      },
      // Google Fonts (스타일시트)
      {
        matcher: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
        handler: new StaleWhileRevalidate({
          cacheName: "google-fonts-stylesheets",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 8,
              maxAgeSeconds: 7 * 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
          ],
        }),
      },
      // 로컬 폰트 파일
      {
        matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
        handler: new CacheFirst({
          cacheName: "static-font-assets",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 16,
              maxAgeSeconds: 30 * 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
          ],
        }),
      },
      // 이미지 (CacheFirst — 변경 빈도 낮음)
      {
        matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i,
        handler: new CacheFirst({
          cacheName: "static-image-assets",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 128,
              maxAgeSeconds: 30 * 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
          ],
        }),
      },
      // Next.js 최적화 이미지
      {
        matcher: /\/_next\/image\?url=.+$/i,
        handler: new CacheFirst({
          cacheName: "next-image",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 128,
              maxAgeSeconds: 30 * 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
          ],
        }),
      },
      // Next.js 정적 JS 번들 (해시 포함, 불변)
      {
        matcher: /\/_next\/static.+\.js$/i,
        handler: new CacheFirst({
          cacheName: "next-static-js-assets",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 64,
              maxAgeSeconds: 30 * 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
          ],
        }),
      },
      // CSS
      {
        matcher: /\.(?:css|less)$/i,
        handler: new CacheFirst({
          cacheName: "static-style-assets",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 32,
              maxAgeSeconds: 30 * 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
          ],
        }),
      },
      // 기타 JS 파일
      {
        matcher: /\.(?:js)$/i,
        handler: new StaleWhileRevalidate({
          cacheName: "static-js-assets",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 48,
              maxAgeSeconds: 7 * 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
          ],
        }),
      },
      // 오디오
      {
        matcher: /\.(?:mp3|wav|ogg)$/i,
        handler: new CacheFirst({
          cacheName: "static-audio-assets",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
            new RangeRequestsPlugin(),
          ],
        }),
      },
      // 비디오
      {
        matcher: /\.(?:mp4|webm)$/i,
        handler: new CacheFirst({
          cacheName: "static-video-assets",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
            new RangeRequestsPlugin(),
          ],
        }),
      },

      // ── API 라우트: NetworkFirst ──

      // 인증 API (캐시 금지)
      {
        matcher: /\/api\/auth\/.*/,
        handler: new NetworkOnly({
          networkTimeoutSeconds: 10,
        }),
      },
      // Next.js 데이터
      {
        matcher: /\/_next\/data\/.+\/.+\.json$/i,
        handler: new NetworkFirst({
          cacheName: "next-data",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
          ],
          networkTimeoutSeconds: 10,
        }),
      },
      // JSON/XML/CSV 데이터
      {
        matcher: /\.(?:json|xml|csv)$/i,
        handler: new NetworkFirst({
          cacheName: "static-data-assets",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
          ],
          networkTimeoutSeconds: 10,
        }),
      },
      // 기타 GET API 요청
      {
        matcher: ({
          sameOrigin,
          url: { pathname },
        }: {
          sameOrigin: boolean;
          url: { pathname: string };
        }) => sameOrigin && pathname.startsWith("/api/"),
        method: "GET" as const,
        handler: new NetworkFirst({
          cacheName: "apis",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60,
              maxAgeFrom: "last-used" as const,
            }),
          ],
          networkTimeoutSeconds: 10,
        }),
      },

      // ── 페이지 네비게이션: StaleWhileRevalidate ──

      // RSC 프리페치 요청
      {
        matcher: ({
          request,
          url: { pathname },
          sameOrigin,
        }: {
          request: Request;
          url: { pathname: string };
          sameOrigin: boolean;
        }) =>
          request.headers.get("RSC") === "1" &&
          request.headers.get("Next-Router-Prefetch") === "1" &&
          sameOrigin &&
          !pathname.startsWith("/api/"),
        handler: new StaleWhileRevalidate({
          cacheName: PAGES_CACHE.rscPrefetch,
          plugins: [
            new ExpirationPlugin({
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60,
            }),
          ],
        }),
      },
      // RSC 요청
      {
        matcher: ({
          request,
          url: { pathname },
          sameOrigin,
        }: {
          request: Request;
          url: { pathname: string };
          sameOrigin: boolean;
        }) =>
          request.headers.get("RSC") === "1" &&
          sameOrigin &&
          !pathname.startsWith("/api/"),
        handler: new StaleWhileRevalidate({
          cacheName: PAGES_CACHE.rsc,
          plugins: [
            new ExpirationPlugin({
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60,
            }),
          ],
        }),
      },
      // HTML 페이지 네비게이션
      {
        matcher: ({
          request,
          url: { pathname },
          sameOrigin,
        }: {
          request: Request;
          url: { pathname: string };
          sameOrigin: boolean;
        }) =>
          request.headers.get("Content-Type")?.includes("text/html") &&
          sameOrigin &&
          !pathname.startsWith("/api/"),
        handler: new StaleWhileRevalidate({
          cacheName: PAGES_CACHE.html,
          plugins: [
            new ExpirationPlugin({
              maxEntries: 32,
              maxAgeSeconds: 24 * 60 * 60,
            }),
          ],
        }),
      },
      // 기타 동일 출처 요청
      {
        matcher: ({
          url: { pathname },
          sameOrigin,
        }: {
          url: { pathname: string };
          sameOrigin: boolean;
        }) => sameOrigin && !pathname.startsWith("/api/"),
        handler: new StaleWhileRevalidate({
          cacheName: "others",
          plugins: [
            new ExpirationPlugin({
              maxEntries: 64,
              maxAgeSeconds: 24 * 60 * 60,
            }),
          ],
        }),
      },
    ];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    navigateFallback: OFFLINE_FALLBACK_URL,
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: OFFLINE_FALLBACK_URL,
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Web Push 이벤트 핸들러
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
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});

serwist.addEventListeners();
