import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Sidebar from "@/components/layout/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VESTRA - AI 자산관리 플랫폼",
  description: "LLM 기반 통합 AI 부동산 자산관리 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {process.env.NEXT_PUBLIC_KAKAO_MAP_KEY && (
          <Script
            src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=services&autoload=false`}
            strategy="afterInteractive"
          />
        )}
        <Sidebar />
        <main className="min-h-screen p-4 pt-16 lg:pt-6 lg:ml-[240px] lg:p-6 transition-all duration-300">
          {children}
        </main>
      </body>
    </html>
  );
}
