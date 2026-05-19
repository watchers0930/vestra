import type { NextConfig } from "next";

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
const googleTagDomains = "https://www.googletagmanager.com";
const googleAnalyticsConnect = "https://www.google-analytics.com https://region1.google-analytics.com";
const isDev = process.env.NODE_ENV !== "production";

// 기본 CSP (unsafe-eval 없음)
const baseCSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${kakaoDomains} ${googleTagDomains}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: ${kakaoImg} https://lh3.googleusercontent.com https://images.unsplash.com`,
  "font-src 'self' data: https://fastly.jsdelivr.net https://fonts.gstatic.com",
  `connect-src 'self' https://api.openai.com https://*.neon.tech ${kakaoConnect} ${googleAnalyticsConnect} https://api.odcloud.kr https://apis.data.go.kr https://fcm.googleapis.com https://*.push.services.mozilla.com https://*.notify.windows.com`,
  `frame-src https://postcode.map.kakao.com ${googleTagDomains}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// 지도 페이지 CSP (카카오맵 SDK 및 개발 런타임 허용)
const mapCSP = baseCSP.includes("'unsafe-eval'")
  ? baseCSP
  : baseCSP.replace(
    `script-src 'self' 'unsafe-inline' ${kakaoDomains} ${googleTagDomains}`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${kakaoDomains} ${googleTagDomains}`,
  );

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      // 나머지 페이지 — unsafe-eval 없음
      {
        source: "/(.*)",
        headers: [...securityHeaders, { key: "Content-Security-Policy", value: baseCSP }],
      },
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
    ];
  },
};

export default nextConfig;
