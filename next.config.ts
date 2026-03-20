import type { NextConfig } from "next";

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
              "script-src 'self' 'unsafe-inline' https://t1.daumcdn.net https://dapi.kakao.com https://postcode.map.kakao.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.daumcdn.net https://*.kakao.com https://lh3.googleusercontent.com",
              "font-src 'self' data:",
              "connect-src 'self' https://api.openai.com https://*.neon.tech https://dapi.kakao.com https://api.odcloud.kr https://apis.data.go.kr",
              "frame-src https://postcode.map.kakao.com",
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

export default nextConfig;
