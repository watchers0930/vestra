import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

// 공통 보안 헤더
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

// 카카오맵 관련 CSP 도메인
const kakaoDomains = "https://t1.daumcdn.net https://dapi.kakao.com https://postcode.map.kakao.com";
const kakaoConnect = "https://dapi.kakao.com https://*.daumcdn.net https://*.kakao.com";
const kakaoImg = "https://*.daumcdn.net https://*.kakao.com https://*.kakao.io";

// 기본 CSP (unsafe-eval 없음)
const baseCSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${kakaoDomains}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: ${kakaoImg} https://lh3.googleusercontent.com`,
  "font-src 'self' data: https://fastly.jsdelivr.net https://fonts.gstatic.com",
  `connect-src 'self' https://api.openai.com https://*.neon.tech ${kakaoConnect} https://api.odcloud.kr https://apis.data.go.kr https://fcm.googleapis.com https://*.push.services.mozilla.com https://*.notify.windows.com`,
  "frame-src https://postcode.map.kakao.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// 지도 페이지 CSP (unsafe-eval 포함 — 카카오맵 SDK 필요)
const mapCSP = baseCSP.replace(
  `script-src 'self' 'unsafe-inline' ${kakaoDomains}`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${kakaoDomains}`,
);

const nextConfig: NextConfig = {
  async headers() {
    return [
      // 지도 페이지 — unsafe-eval 허용
      {
        source: "/price-map",
        headers: [...securityHeaders, { key: "Content-Security-Policy", value: mapCSP }],
      },
      {
        source: "/prediction",
        headers: [...securityHeaders, { key: "Content-Security-Policy", value: mapCSP }],
      },
      {
        source: "/jeonse/:path*",
        headers: [...securityHeaders, { key: "Content-Security-Policy", value: mapCSP }],
      },
      {
        source: "/rights",
        headers: [...securityHeaders, { key: "Content-Security-Policy", value: mapCSP }],
      },
      {
        source: "/feasibility",
        headers: [...securityHeaders, { key: "Content-Security-Policy", value: mapCSP }],
      },
      // 나머지 페이지 — unsafe-eval 없음
      {
        source: "/(.*)",
        headers: [...securityHeaders, { key: "Content-Security-Policy", value: baseCSP }],
      },
    ];
  },
};

export default withSerwist(nextConfig);
