import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "시세전망",
  description: "실거래가 데이터 기반으로 시세 추이와 향후 전망을 분석합니다",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
