import type { NextConfig } from "next";

// 공통 보안 헤더
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // CSP 위반 리포트 수신 엔드포인트. 외부 공급사(카카오맵 등)가 도메인/CDN을 바꿔
  // 리소스가 CSP에 막히는 순간, 브라우저가 자동으로 /api/csp-report 로 신고한다(사용자보다 먼저 감지).
  { key: "Reporting-Endpoints", value: 'csp-endpoint="/api/csp-report"' },
];

// 카카오맵 관련 CSP 도메인
// ⚠️ 카카오맵 SDK(dapi.kakao.com)는 실제 지도 엔진 스크립트를 t1.kakaocdn.net 에서 로드한다.
//    이 호스트가 script-src에 없으면 지도 엔진이 CSP에 막혀 '지도를 불러오는 중…'에서 영구 정지한다.
const kakaoDomains = "https://t1.daumcdn.net https://t1.kakaocdn.net https://dapi.kakao.com https://postcode.map.kakao.com";
const kakaoConnect = "https://dapi.kakao.com https://*.daumcdn.net https://*.kakaocdn.net https://*.kakao.com";
const kakaoImg = "https://*.daumcdn.net https://*.kakaocdn.net https://*.kakao.com https://*.kakao.io";
const googleTagDomains = "https://www.googletagmanager.com";
const googleAnalyticsConnect = "https://www.google-analytics.com https://region1.google-analytics.com";
// 토스페이먼츠 CSP 도메인
const tossDomains = "https://js.tosspayments.com";
const tossConnect = "https://*.tosspayments.com https://*.toss.im";
const tossFrame = "https://*.tosspayments.com https://*.toss.im";
// 포트원 V1(아임포트) + V2(portone.io) + 다날 결제 CSP 도메인 (회원 구독 V2 + 비회원 등기감시 V1)
// iamport SDK는 *.iamport.kr 뿐 아니라 *.iamport.co(텔레메트리 coretelemetry.prod.iamport.co 등)도 사용.
// V2 @portone/browser-sdk는 런타임에 https://cdn.portone.io 에서 컨트롤러를 로드하고 api.portone.io로 통신한다.
// 이 호스트가 script-src에 없으면 window.PortOne이 undefined가 되어 결제창이 열리지 않는다(실환경 검증으로 확인).
const portoneDomains = "https://cdn.iamport.kr https://service.iamport.kr https://*.iamport.co https://cdn.portone.io";
const portoneConnect = "https://api.iamport.kr https://service.iamport.kr https://*.iamport.kr https://*.iamport.co https://api.portone.io https://*.portone.io";
const portoneFrame = "https://*.iamport.kr https://*.iamport.co https://*.portone.io https://*.danalpay.com https://*.teledit.com https://*.danal.co.kr https://pg.danal.co.kr";
const isDev = process.env.NODE_ENV !== "production";
// Vercel 프리뷰 환경에서 Live Feedback 스크립트 허용
const isVercelPreview = process.env.VERCEL_ENV === "preview";
const vercelLive = isVercelPreview ? " https://vercel.live" : "";

// 기본 CSP (unsafe-eval 없음)
const baseCSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${vercelLive} ${kakaoDomains} ${googleTagDomains} ${tossDomains} ${portoneDomains}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: ${kakaoImg} https://lh3.googleusercontent.com https://images.unsplash.com`,
  "font-src 'self' data: https://fastly.jsdelivr.net https://fonts.gstatic.com",
  `connect-src 'self' https://api.openai.com https://*.neon.tech ${kakaoConnect} ${googleAnalyticsConnect} https://api.odcloud.kr https://apis.data.go.kr https://fcm.googleapis.com https://*.push.services.mozilla.com https://*.notify.windows.com ${tossConnect} ${portoneConnect}`,
  `frame-src https://postcode.map.kakao.com${isDev ? " http://postcode.map.kakao.com" : ""} ${googleTagDomains} ${tossFrame}${vercelLive} ${portoneFrame}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // CSP 위반 자동 신고 — 신형(report-to) + 구형(report-uri) 병행으로 브라우저 호환성 확보
  "report-uri /api/csp-report",
  "report-to csp-endpoint",
].join("; ");

// 임베드 위젯 CSP — 외부 사이트 iframe 삽입이 목적이므로
// X-Frame-Options(DENY)를 제외하고 frame-ancestors로 전체 허용한다.
// 위젯은 공개 통계/계산만 노출(로그인·민감작업 없음)이라 clickjacking 위험이 낮다.
const embedSecurityHeaders = securityHeaders.filter((h) => h.key !== "X-Frame-Options");
const embedCSP = `${baseCSP}; frame-ancestors *`;

// 지도 페이지 CSP (카카오맵 SDK 및 개발 런타임 허용)
const mapCSP = baseCSP.includes("'unsafe-eval'")
  ? baseCSP
  : baseCSP.replace(
    `script-src 'self' 'unsafe-inline' ${kakaoDomains} ${googleTagDomains}`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${kakaoDomains} ${googleTagDomains}`,
  );

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // 네이티브 모듈(@napi-rs/canvas)은 번들링하지 않고 런타임에 node_modules에서
  // 로드해야 서버리스에서 .node 바이너리가 정상 동작한다. (PDF→이미지 렌더용)
  serverExternalPackages: ["@napi-rs/canvas"],
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
      // 임베드 위젯 — 외부 iframe 허용(X-Frame-Options 제외 + frame-ancestors *)
      {
        source: "/embed/:path*",
        headers: [...embedSecurityHeaders, { key: "Content-Security-Policy", value: embedCSP }],
      },
      // 나머지 페이지 — unsafe-eval 없음 (embed 제외)
      {
        source: "/((?!embed/).*)",
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
