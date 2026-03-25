import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t1.daumcdn.net https://dapi.kakao.com https://postcode.map.kakao.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.daumcdn.net https://*.kakao.com https://*.kakao.io https://lh3.googleusercontent.com",
              "font-src 'self' data: https://fastly.jsdelivr.net",
              "connect-src 'self' https://api.openai.com https://*.neon.tech https://dapi.kakao.com https://*.daumcdn.net https://*.kakao.com https://api.odcloud.kr https://apis.data.go.kr https://fcm.googleapis.com https://*.push.services.mozilla.com https://*.notify.windows.com",
              "frame-src https://postcode.map.kakao.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
