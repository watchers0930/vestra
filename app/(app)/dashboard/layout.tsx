import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "대시보드",
  description: "보유 자산 현황과 주요 지표를 한눈에 확인합니다",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
