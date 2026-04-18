import type { Metadata } from "next";

declare global {
  interface Window {
    __kakaoMapsReady?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any;
  }
}
import { Geist, Geist_Mono, Sora } from "next/font/google";

import "./globals.css";
import SessionProvider from "@/components/auth/session-provider";
import { ToastProvider } from "@/components/common/toast";

import KakaoScript from "@/components/common/KakaoScript";
import JsonLd from "@/components/common/JsonLd";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "VESTRA - AI 자산관리 플랫폼",
    template: "%s | VESTRA - AI 자산관리 플랫폼",
  },
  description:
    "AI가 분석하는 부동산 자산관리. 등기부등본 분석, 계약서 검토, 세무 시뮬레이션, 시세 전망, 전세 안전성 진단까지 한 곳에서.",
  keywords: [
    "부동산",
    "AI",
    "자산관리",
    "등기부등본",
    "전세",
    "시세분석",
    "계약검토",
    "대출",
    "시세전망",
    "시세지도",
    "부동산 AI",
    "전세대출",
    "권리분석",
    "세금계산",
  ],
  authors: [{ name: "BMI C&S" }],
  creator: "BMI C&S",
  publisher: "BMI C&S",
  metadataBase: new URL("https://vestra-plum.vercel.app"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://vestra-plum.vercel.app",
    siteName: "VESTRA",
    title: "VESTRA - AI 자산관리 플랫폼",
    description:
      "AI가 분석하는 부동산 자산관리. 등기부등본 분석, 계약서 검토, 세무 시뮬레이션, 시세 전망, 전세 안전성 진단까지 한 곳에서.",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "VESTRA - AI 자산관리 플랫폼" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VESTRA - AI 자산관리 플랫폼",
    description:
      "AI가 분석하는 부동산 자산관리. 등기부등본 분석, 계약서 검토, 세무 시뮬레이션, 시세 전망까지 한 곳에서.",
    images: ["/og-image.svg"],
    creator: "@vestra",
  },
  manifest: "/manifest.json",
  category: "finance",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "VESTRA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta name="theme-color" content="#4F46E5" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet" />
        <JsonLd />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} antialiased`}
      >
        <SessionProvider>
          <ToastProvider>
            <KakaoScript />
            {children}
          </ToastProvider>
        </SessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
